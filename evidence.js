const evidenceEl = id => document.getElementById(id);
const evidenceEscape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const percent = value => `${(value * 100).toFixed(1)}%`;

function renderEvidence(report) {
  const {split, results, quality, replay} = report;
  evidenceEl('evidence-decision').innerHTML = `<strong>选择依据</strong><p>验证期先限定误报不超过每有效站周 1 个；只有趋势规则满足（${report.validationResults.trend.falseAlertsPerStationWeek.toFixed(3)}）。独立测试中，它检出 ${results.trend.tp} 个前兆小时，误报 ${results.trend.fp} 个；实验 AI 模型未被选用。</p>`;
  evidenceEl('evidence-stats').innerHTML = [
    ['测试样本', split.testRows.toLocaleString('zh-CN'), '逐站小时 · 2026 年 4–8 月'],
    ['前兆检出率', percent(results.trend.recall), `识别 ${results.trend.tp} / ${split.testEventHours} 个高风险前兆小时`],
    ['提醒命中率', percent(results.trend.precision), '发出提醒后，未来两小时确实达到 7+ 的比例'],
    ['误报负担', results.trend.falseAlertsPerStationWeek.toFixed(3), '每个有效站周的误报小时'],
  ].map(([label, value, note]) => `<div class="evidence-stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  const items = [
    ['趋势规则 · 采用', results.trend, 'selected'],
    ['AQHI ≥ 6 即提醒', results.nearThreshold, ''],
    ['加权逻辑回归 · 实验', results.model, ''],
  ];
  evidenceEl('comparison-table').innerHTML = `<table><thead><tr><th scope="col">方法</th><th scope="col">召回率</th><th scope="col">提醒命中率</th><th scope="col">误报 / 有效站周</th></tr></thead><tbody>${items.map(([name, m, cls]) => `<tr class="${cls}"><th scope="row">${name}</th><td>${percent(m.recall)}</td><td>${percent(m.precision)}</td><td>${m.falseAlertsPerStationWeek.toFixed(3)}</td></tr>`).join('')}</tbody></table>`;
  evidenceEl('evidence-method').innerHTML = `数据：<a href="${report.sourceUrl}" target="_blank" rel="noopener noreferrer">香港环保署逐小时 AQHI 历史 CSV ↗</a>（${report.months.join('—')}）；训练 ${split.train}，验证 ${split.validation}，独立测试 ${split.test}。缺失 ${quality.missing.toLocaleString('zh-CN')} 条、官方 * 替代读数 ${quality.substituted.toLocaleString('zh-CN')} 条不作为有效特征或目标。${report.method} ${report.selectionPolicy}模型阈值与方法选择均在验证期确定，测试期仅报告结果。以下结果是逐小时回测，不证明真实作业或健康收益。`;
  renderReplay(replay);
  window.setAirHistory?.(report);
}

function renderReplay(replay) {
  const times = [...new Set(replay.rows.map(row => row.time))].sort();
  const select = evidenceEl('replay-hour');
  select.innerHTML = times.map(time => `<option value="${time}">${time.replace('T', ' · ')} 香港时间</option>`).join('');
  // Start at the verified historical hour chosen by the backtest script.
  select.value = replay.end;
  const show = () => {
    const rows = replay.rows.filter(row => row.time === select.value);
    const alerts = rows.filter(row => row.ruleAlert);
    evidenceEl('replay-summary').textContent = `${rows.filter(row => row.eligible).length} 个可评价测站 · ${alerts.length} 条规则提醒`;
    evidenceEl('replay-list').innerHTML = rows.sort((a, b) => Number(b.ruleAlert) - Number(a.ruleAlert) || Number(b.actualHighIn2h) - Number(a.actualHighIn2h) || a.station.localeCompare(b.station)).map(row => {
      const outcome = !row.eligible?'未纳入评估':row.ruleAlert ? (row.actualHighIn2h ? '命中' : '误报') : (row.actualHighIn2h ? '漏报' : '无预警');
      const shown=row.observed==null?'—':row.observed===11?'10+':row.observed;
      return `<div class="replay-row ${row.ruleAlert ? 'alert' : ''}"><strong>${evidenceEscape(row.station)}</strong><span>当时 AQHI ${shown}</span><span class="replay-outcome ${outcome === '命中' ? 'hit' : outcome === '漏报' ? 'miss' : ''}">${outcome}</span><small>${!row.eligible?evidenceEscape(row.reason):row.actualHighIn2h ? `${row.leadHours} 小时后达 7+` : '未来两小时未达 7+'}</small></div>`;
    }).join('');
    window.setAirHistoryTime?.(select.value);
  };
  select.addEventListener('change', show);
  show();
}

fetch('./data/backtest-report.json')
  .then(response => {if (!response.ok) throw new Error('报告未能载入'); return response.json();})
  .then(renderEvidence)
  .catch(() => {
    evidenceEl('evidence-decision').textContent = '回测报告暂时无法载入。请通过本地服务器打开项目并检查数据文件。';
    evidenceEl('replay-summary').textContent = '历史回放不可用';
  });

evidenceEl('cost-form').addEventListener('input', () => {
  const ids = ['cost-checks', 'cost-minutes', 'cost-hourly', 'cost-annual'];
  const fields = ids.map(id => evidenceEl(id));
  const output = evidenceEl('cost-output');
  if (fields.some(field => field.value === '')) {
    output.textContent = '输入四项假设后显示年净额。';
    return;
  }
  const [checks, minutes, hourly, annual] = fields.map(field => Number(field.value));
  if ([checks, minutes, hourly, annual].some(value => !Number.isFinite(value) || value < 0)) {
    output.textContent = '请输入不小于 0 的有效数值。';
    return;
  }
  const gross = checks * minutes / 60 * hourly;
  const net = gross - annual;
  output.textContent = `假设节省人工成本 HK$ ${gross.toLocaleString('en-HK', {maximumFractionDigits: 0})}／年；扣除系统成本后的情景净额 HK$ ${net.toLocaleString('en-HK', {maximumFractionDigits: 0})}／年。需通过真实试点验证每次节省时间。`;
});
