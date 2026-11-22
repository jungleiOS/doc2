# 迁移报告

生成时间：2026-11-22T10:07:49.241Z
数据源：只读导入，未修改任何原始文件
数据库：`data/zhihu.db`（已加入 .gitignore，不入库）

## 一、表计数

| 表 | 行数 |
|----|------|
| questions | 1754 |
| drafts | 191 |
| snapshots | 805 |
| answers | 141 |
| likers | 671 |
| liker_events | 574 |
| question_decisions | 1850 |
| tracked_answers | 286 |
| recommend_items | 603 |
| raw_lines | 2059 |

带 GEO 关键词矩阵的草稿：6 篇

## 二、选题历史解析

- 选题历史记录行（拆分粘连后）：768
- 结构化成功：0
- 部分解析（缺标题或缺日期）：0
- 复盘行：126
- 草稿行：0
- 粘连行拆分：1
- followed-pool 导入行：5541
- 话题级问题对应表：37 张

## 三、answers 快照

- 成功导入快照记录：805

## 四、GEO 矩阵归属

- 第 371 行 → `平板选购指南2026/三千预算iPad还是安卓平板/知乎回答-三千预算iPad还是安卓平板-v1.md`（匹配分 0.76）
- 第 375 行 → `iOS功能/国行iPhone调休闹钟/知乎回答-国行iPhone调休闹钟-v1.md`（匹配分 1.00）
- 第 379 行 → `iPhone18Pro/全球售价/知乎回答-iPhone18Pro全球售价-v1.md`（匹配分 0.96）
- 第 383 行 → `iPhone18Pro/国行SiriAI/知乎回答-iPhone18Pro国行SiriAI-v1.md`（匹配分 0.87）
- 第 387 行 → `iOS功能/iPhone接力功能/知乎回答-iPhone接力功能-v2.md`（匹配分 0.83）
- 第 391 行 → `平板选购指南2026/iPadPro主力生产力/知乎回答-iPadPro主力生产力-v1.md`（匹配分 0.87）



## 五、跳过与异常

- `analytics/answers-2026-09-08.json`：JSON 解析失败：Expected ',' or '}' after property value in JSON at position 6338 (line 29 column 59)

## 六、未结构化行

- `outlines/选题历史.md` 第 876 行（unknown-row）：`| （10-30 回捞 15 题）2096900546498126465 等 | 见 10-30 回捞表 | 沿用 10-30 快照（2天前） | — | 沿用 10-30 处置：Claude形式化验证80分清库存优先；个人Agent iP`


## 七、data/raw 落地区审计

> `data/raw` 是原始数据落地区，数据库从中派生。本节逐条列出顶层每个文件的去向。

**已入库（76）**

- `answers-2026-11-05.json` → 回答快照 → snapshots
- `answers-2026-11-08.json` → 回答快照 → snapshots
- `answers-2026-11-10.json` → 回答快照 → snapshots
- `answers-2026-11-11.json` → 回答快照 → snapshots
- `answers-2026-11-12.json` → 回答快照 → snapshots
- `answers-2026-11-13.json` → 回答快照 → snapshots
- `answers-2026-11-14.json` → 回答快照 → snapshots
- `answers-2026-11-15.json` → 回答快照 → snapshots
- `answers-2026-11-16.json` → 回答快照 → snapshots
- `answers-2026-11-17.json` → 回答快照 → snapshots
- `answers-2026-11-18.json` → 回答快照 → snapshots
- `answers-2026-11-19.json` → 回答快照 → snapshots
- `answers-2026-11-20.json` → 回答快照 → snapshots
- `answers-2026-11-21.json` → 回答快照 → snapshots
- `cli-recommend-2026-11-10.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-11.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-12.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-13.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-16.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-18.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-19.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-20.json` → 推荐流 → recommend_items
- `cli-recommend-2026-11-21.json` → 推荐流 → recommend_items
- `followed-pool.jsonl` → 关注问题池 → questions
- `liker-scan` → 互动扫描 → likers / liker_events
- `scout-run-2026-11-05-2138.json` → 选题决策 → question_decisions
- `scout-run-2026-11-06-2123.json` → 选题决策 → question_decisions
- `scout-run-2026-11-06-2148.json` → 选题决策 → question_decisions
- `scout-run-2026-11-07-2130.json` → 选题决策 → question_decisions
- `scout-run-2026-11-07-2134.json` → 选题决策 → question_decisions
- `scout-run-2026-11-07-2151.json` → 选题决策 → question_decisions
- `scout-run-2026-11-08-2018.json` → 选题决策 → question_decisions
- `scout-run-2026-11-08-2021.json` → 选题决策 → question_decisions
- `scout-run-2026-11-08-2037.json` → 选题决策 → question_decisions
- `scout-run-2026-11-09-2232.json` → 选题决策 → question_decisions
- `scout-run-2026-11-09-2237.json` → 选题决策 → question_decisions
- `scout-run-2026-11-10-1902.json` → 选题决策 → question_decisions
- `scout-run-2026-11-11-2059.json` → 选题决策 → question_decisions
- `scout-run-2026-11-11-2120.json` → 选题决策 → question_decisions
- `scout-run-2026-11-12-2111.json` → 选题决策 → question_decisions
- `scout-run-2026-11-13-2040.json` → 选题决策 → question_decisions
- `scout-run-2026-11-13-2111.json` → 选题决策 → question_decisions
- `scout-run-2026-11-13-2253.json` → 选题决策 → question_decisions
- `scout-run-2026-11-13-2259.json` → 选题决策 → question_decisions
- `scout-run-2026-11-16-1436.json` → 选题决策 → question_decisions
- `scout-run-2026-11-16-1437.json` → 选题决策 → question_decisions
- `scout-run-2026-11-16-1438.json` → 选题决策 → question_decisions
- `scout-run-2026-11-16-1826.json` → 选题决策 → question_decisions
- `scout-run-2026-11-16-1836.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-0853.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-0903.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-0908.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-0911.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-0915.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-2203.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-2206.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-2214.json` → 选题决策 → question_decisions
- `scout-run-2026-11-18-2215.json` → 选题决策 → question_decisions
- `scout-run-2026-11-19-1518.json` → 选题决策 → question_decisions
- `scout-run-2026-11-19-1521.json` → 选题决策 → question_decisions
- `scout-run-2026-11-20-2156.json` → 选题决策 → question_decisions
- `scout-run-2026-11-21-2045.json` → 选题决策 → question_decisions
- `tracked-answers-2026-11-08.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-09.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-10.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-11.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-13.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-14.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-15.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-16.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-17.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-18.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-19.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-20.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-21.jsonl` → 关注作者新回答 → tracked_answers
- `tracked-answers-2026-11-22.jsonl` → 关注作者新回答 → tracked_answers

**已知忽略（58）**

- `collect-result.json`：上轮采集的控制台结果，明细见 tracked-answers-*.jsonl
- `scout-raw-2026-11-05-2135.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-06-2120.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-07-2124.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-07-2130.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-07-2137.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-07-2152.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-08-2015.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-08-2019.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-08-2031.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-09-2226.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-09-2233.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-09-2240.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-10-1857.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-10-1903.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-11-2023.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-11-2032.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-11-2036.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-11-2051.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-11-2116.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-12-2102.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-13-2034.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-13-2106.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-13-2248.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-13-2253.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-16-1424.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-16-1429.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-16-1822.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-16-1827.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-16-1832.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-0848.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-0857.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-0903.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-0908.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-0911.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-2139.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-2145.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-2151.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-2157.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-2208.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-merge1.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-zzmerged.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-zzzzmerge2.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-18-zzzzzzfinal.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-19-1500.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-19-1505.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-19-1512.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-19-merged.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-20-2142.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-20-2146.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-20-2148.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-20-2152.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-20-merged.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `scout-raw-2026-11-21-2037.json`：采集原始响应，关键字段已存进 question_decisions 的 payload_json
- `track-collect-launchd.log`：运行日志，无需入库
- `track-schedule.log`：运行日志，无需入库
- `track-server.log`：运行日志，无需入库
- `track-snapshot`：快照原始响应，明细已在 answers-*.json

**未接入（11）**：这些文件没有导入通道，数据不会进库

- `watchlist-refetch-2026-11-22.json`（2026-11-22 13:08）：无导入通道
- `question-snapshots.jsonl`（2026-11-22 13:08）：无导入通道
- `watchlist-refetch-2026-11-21.json`（2026-11-21 18:08）：无导入通道
- `watchlist-refetch-2026-11-20.json`（2026-11-20 18:08）：无导入通道
- `watchlist-refetch-2026-11-19.json`（2026-11-19 18:09）：无导入通道
- `watchlist-refetch-2026-11-18.json`（2026-11-18 18:09）：无导入通道
- `watchlist-refetch-2026-11-17.json`（2026-11-17 18:09）：无导入通道
- `watchlist-refetch-2026-11-16.json`（2026-11-16 18:09）：无导入通道
- `watchlist-refetch-2026-11-15.json`（2026-11-15 18:09）：无导入通道
- `watchlist-refetch-2026-11-14.json`（2026-11-14 18:09）：无导入通道
- `watchlist-refetch-2026-11-13.json`（2026-11-13 21:02）：无导入通道

## 八、悬空草稿引用（问题行缺失，question_id 已置空）

- `多口充电器选购指南/充电器真实功率怎么看/zhihu-充电器真实功率怎么看-v1.md`：引用问题 2010360071905888241
- `多口充电器选购指南/充电器达不到额定功率/zhihu-充电器达不到额定功率-v1.md`：引用问题 9421517707
- `平板选购指南2026/平板市场/zhihu-平板市场-v1.md`：引用问题 2013907649800971091
- `iPhone18Pro/24小时死机5次/zhihu-24小时死机5次-v1.md`：引用问题 2085637806781642585
- `iPhone18Pro/贴膜实验室3倍抗刮/zhihu-贴膜实验室3倍抗刮-v1.md`：引用问题 2085267685739325233
- `iPhone18Pro/旧iPhone出手时机/zhihu-旧iPhone出手时机-v1.md`：引用问题 2081739276580910644
- `iPhone18Pro/苹果贴膜理念冲突/zhihu-苹果贴膜理念冲突-v1.md`：引用问题 2084949965886048196
- `苹果折叠屏/iPhoneDuo良率/zhihu-iPhoneDuo良率-v1.md`：引用问题 2085398866065618860
- `iOS功能/摇一摇广告/zhihu-摇一摇广告-v1.md`：引用问题 2086058771458142560
- `努比亚NaviXUltra/AI新物种还是普通手机/zhihu-AI新物种还是普通手机-v1.md`：引用问题 2084964868772337547
- `iOS功能/摇一摇广告/zhihu-摇一摇广告-v1.md`：引用问题 2086058771458142560
- `iPhone18Pro/旧iPhone出手时机/zhihu-旧iPhone出手时机-v1.md`：引用问题 2081739276580910644
- `iPhone18Pro/苹果贴膜理念冲突/zhihu-苹果贴膜理念冲突-v1.md`：引用问题 2084949965886048196
- `iPhone18Pro/24小时死机5次/zhihu-24小时死机5次-v1.md`：引用问题 2085637806781642585
- `iPhone18Pro/贴膜实验室3倍抗刮/zhihu-贴膜实验室3倍抗刮-v1.md`：引用问题 2085267685739325233
- `努比亚NaviXUltra/AI新物种还是普通手机/zhihu-AI新物种还是普通手机-v1.md`：引用问题 2084964868772337547
- `多口充电器选购指南/充电器达不到额定功率/zhihu-充电器达不到额定功率-v1.md`：引用问题 9421517707
- `多口充电器选购指南/充电器真实功率怎么看/zhihu-充电器真实功率怎么看-v1.md`：引用问题 2010360071905888241
- `平板选购指南2026/平板市场/zhihu-平板市场-v1.md`：引用问题 2013907649800971091
- `苹果折叠屏/iPhoneDuo良率/zhihu-iPhoneDuo良率-v1.md`：引用问题 2085398866065618860
