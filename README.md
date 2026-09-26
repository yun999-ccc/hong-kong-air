# 香港空气风险决策实验室

赛道二研究原型。目标场景是城市公共服务中的户外作业管理，首个假设用户为环卫等户外作业团队的主管。网页将**当前官方观测**、**已完成的历史回测**、**行业工作流建议**和**商业可行性假设**分开展示。

**状态：**当前地图从香港政府开放数据接口读取 15 个一般站、3 个路边站的 AQHI。短时预警只做了历史数据回测和回放，**没有上线为实时预测、自动排班或官方预警**。用户访谈、作业排班数据和实际试点尚未完成。

地图的「地图图层」菜单可独立勾选行政区界、测站名称与数据状态。切到「历史回放」时，额外提供预警结果图层：外环绿色＝命中、黄色＝误报、红色＝漏报。历史时间选择与下方回放列表同步；未纳入两小时评估的测站仍显示当时可用读数和原因，且不会被算作“无预警”。

## 运行网站

在本目录执行 `python3 -m http.server 8080`，然后打开 `http://localhost:8080/`。网页无需安装第三方前端依赖。直接双击 `index.html` 可能阻止读取本地 JSON。

### 公开访问

本项目是静态网页，可将仓库根目录的 `index.html` 和 `data/` 等文件发布到 GitHub Pages。页面中的地图、历史回测与备用快照随仓库一同发布；当前 AQHI 与官方预报优先从香港政府接口读取，接口不可用时会显示仓库里的快照并标出数据时间。公开网址不依赖本机的 `localhost:8080` 服务。

## 可检验任务和结果

每个整点，当测站 AQHI **低于 7** 时，根据当时已经可用的信息判断未来两小时是否首次达到 **7 或以上**。只统计特征和未来目标均完整、且没有环保署 `*` 替代测站标记的逐站小时。

| 方法 | 测试集召回率 | 提醒命中率 | 误报／有效站周 |
|---|---:|---:|---:|
| AQHI 为 6 且比上一小时升高（原型采用） | 38.8% | 48.7% | 0.285 |
| AQHI 达 6 即提醒 | 63.6% | 20.9% | 1.683 |
| 加权逻辑回归（实验对照，不采用） | 39.3% | 21.5% | 0.997 |

这些指标来自 **2026 年 4–8 月独立时间测试集的 58,280 个有效逐站小时**，其中 242 个属于未来两小时将升至 7+ 的前兆小时。规则命中 94 个、误报 99 个；模型命中 95 个、误报 346 个。误报／站周的分母是有效测试逐站小时数除以 168。它们是**逐小时判断指标**，不是独立污染事件数量，也不是健康或作业收益。

训练期：2025 年 4–12 月；验证期：2026 年 1–3 月；测试期：2026 年 4–8 月。逻辑回归只用过去 3 小时 AQHI、测站类型、时刻、季节和测站标识；验证期选择模型阈值 0.50。**方法选择也先在验证期完成：误报必须不超过每有效站周 1 个；满足该约束的方法中选召回率最高者。**验证期趋势规则为 0.909，实验模型为 2.858，简单阈值为 4.589，因此选用趋势规则。测试期只报告固定方法的结果，未用于模型训练或选择。此方案避开 2025 年 3 月 22 日的 AQHI 计算方法更新边界。

## 复现数据与回测

原始月度 CSV 位于 `data/history/`，涵盖 2025 年 4 月至 2026 年 8 月。`manifest.json` 记录每份文件的官方 URL、大小和 SHA-256。下载程序会保留已有文件；传入 `--refresh` 才会重下，刷新后结果可能因源文件修订而变化。

```bash
python3 scripts/fetch_history.py
OPENBLAS_NUM_THREADS=1 python3 scripts/backtest.py
```

回测只需要 Python 与 NumPy。结果写入 `data/backtest-report.json`，网页读取该文件。原始数据共 215,444 条有效数值、8,116 条带 `*` 标记的官方替代读数和 216 条空值；样本构造还要求连续过去两小时和未来两小时均有效，因此最终训练／验证／测试样本数较少。`*` 的含义来自 CSV 文件顶部官方说明。

历史数据：[香港环保署逐小时 AQHI 历史记录](https://data.gov.hk/en-data/dataset/hk-epd-airteam-past-record-of-air-quality-health-index-en)。AQHI 风险分级与 2025 年计算方法变化：[环保署说明](https://www.aqhi.gov.hk/en/what-is-aqhi/about-aqhi.html)、[常见问题](https://www.aqhi.gov.hk/en/what-is-aqhi/faqs.html)。

AQHI 7 在本项目中只是**提前复核阈值**，不是停工阈值。环保署对户外工作雇员的具体健康建议按风险等级区分，雇主风险评估建议主要出现在“甚高”与“严重”级别：[官方分组建议](https://www.aqhi.gov.hk/sc/health-advice/sub-health-advice.html)。

## 当前观测与地图资料

- 逐站当前 AQHI：[DATA.GOV.HK 城市仪表板资源](https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk2-city-dashboard-aqhi/resource/bff1f81c-0982-450e-a135-ebe99e307a9e)，网页读取 `https://dashboard.data.gov.hk/api/aqhi-individual?format=json`。
- 官方时段预报：[DATA.GOV.HK 预报资源](https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk2-city-dashboard-aqhi/resource/7830b813-bd62-405f-8a69-152ed58b85ff)，网页读取 `https://static.data.gov.hk/opendata/dataset/aqhi/aqhi-forecast.json`。它按一般站／路边站发布，并非逐站小时预报，未作为同尺度的模型基线。
- 区界：[香港民政事务总署 18 区边界](https://data.gov.hk/en-data/dataset/hk-had-json1-hong-kong-administrative-boundaries)，本地 `data/districts.json`。
- 海岸线：[hk_osm_map](https://github.com/bmkor/hk_osm_map) 的 OpenStreetMap 衍生资料（MIT 许可），本地 `data/land.geojson`。该提取可能与最新填海岸线略有差异。
- 一般站位置参考[论文补充材料 Table S1](https://acp.copernicus.org/articles/22/11239/2022/acp-22-11239-2022-supplement.pdf)，路边站根据[环保署测站地址](https://www.aqhi.gov.hk/en/monitoring-network/air-quality-monitoring-stations.html)约略定位。地图不能用于街道导航或整区推断。
- `data/aqhi-snapshot.json` 和 `data/forecast-snapshot.json` 是 2026-09-25 获取的官方数据存档，仅供在线接口中断时演示，页面会标明旧数据。

## 赛道二剩余验证

1. 访谈至少一类真实户外作业团队，确认谁能调整任务、任务类型、可接受误报量和通知渠道；当前用户画像及付费可能性只是待验证假设。
   [食环署公开的外判街道清洁服务资料](https://www.fehd.gov.hk/english/legco/2025-26/EEB%28F%29088.pdf)证实潜在应用场景存在，但不能据此推断采购需求或市场规模。
2. 获得真实作业任务与处理记录，试点比较“只看当前值”与“有前兆复核提醒”的操作成本。当前没有证据表明系统减少健康损害或节省经费。
3. 若要上线当前逐站预警，建设后台持续保存至少最近 3 小时官方读数、每小时运行规则、监控断流和数据过期，并建立人工确认与审计记录。当前静态网页不具备这一能力。
4. 取得部署与通知渠道报价后填写网页的成本情景表；其输出只用于讨论假设，不能当作实际收益。

比赛提交时应同时提供网页、技术说明、数据与回测复现方法、市场访谈和试点计划。通知要求复赛提交作品、决赛现场答辩，但未规定“仅交网页”即可满足赛道二。
