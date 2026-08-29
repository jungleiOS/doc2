---
name: zhihu-answer-tracker
description: 用 ego-browser 采集自己知乎账号已发布回答的表现数据（阅读/赞同/评论/收藏/喜欢），对照 outlines/选题历史.md 识别处于 24h/7d 复盘窗口的回答，回写复盘行（含问题页排名），为 zhihu-question-scout 的 5.4 校准回路供数。当用户说「回采」「复盘」「采集我的回答数据」「看看我的回答表现」时触发。
---

# 知乎回答数据追踪（zhihu-answer-tracker）

定位：zhihu-question-scout **5.4 校准回路的数据采集端**。回答由用户手动发布后，本 skill 把表现数据拿回来、写回 `outlines/选题历史.md`，攒够样本后输出校准建议。

## 1. 浏览器通道检查（必做）

主力通道 **ego-browser**，task space 名 `zhihu-tracker`：

```bash
ego-browser nodejs <<'EOF'
const ts = await useOrCreateTaskSpace('zhihu-tracker');
const tab = await openOrReuseTab('https://www.zhihu.com/creator/manage/creation/all', {wait:true});
await new Promise(r=>setTimeout(r,3000));
console.log(await js(`document.title`));
EOF
```

备用通道 WebBridge（session 名 `zhihu-tracker`），检查与故障处理同 zhihu-question-scout 第 1 步。返回登录墙则提示用户先在浏览器登录知乎。

## 2. 采集回答列表（主数据）

创作中心「内容管理」的回答列表：每条含发布时间、赞同/评论/收藏/喜欢，阅读数在列表或「数据中心」（**URL 与各字段位置 2026-08-29 起待首次实测校准，校准后回写本节**）。

流程：navigate → sleep 3~4 秒 → 滚动加载至覆盖最近 30 天发布的回答 → evaluate 提取。

每条产出固定字段：

```json
{"questionTitle":"…","questionUrl":"…","answerUrl":"…","publishedAt":"2026-08-29","reads":0,"upvotes":0,"comments":0,"favorites":0,"likes":0}
```

- 提取脚本的选择器首次使用必须实测校准，校准后把可用脚本回写进本文件；
- **首次采集必须逐字段与页面人工核对**（防止列对错，如把评论数当收藏数）；
- 返回空列表时先 snapshot 确认是否登录墙或页面改版，不编造数据。

## 3. 存快照

写入 `analytics/answers-<YYYY-MM-DD>.json`（目录不存在则创建）。同日重复采集覆盖同名文件；不同日期的快照全部保留，形成时间序列——快照是能力先验分析的原始数据，不删不合并。

## 4. 识别复盘窗口并回写

读 `outlines/选题历史.md`，按问题 ID（questionUrl 中的数字）与快照匹配：

- 发布满 24h 且该题无复盘行 → 写 24h 数据；
- 发布满 7d → **就地更新同一复盘行**的 7d 数据，不重复加行；
- 复盘行格式（与 scout 第 8 步一致）：来源列写「复盘」，标题列写「24h 赞同 x / 7d 赞同 x / 排名 x/N」。

**排名只能去问题页抓**：仅对处于复盘窗口的题逐个打开（一轮通常 ≤3 个），navigate → sleep 3 秒 → 按开头句或用户名定位自己的回答，数默认排序下的位次；不在前 20 条记「排名 >20」。赞数等五指标以创作中心快照为准，不从问题页重复抓。

## 5. 校准输出（复盘行 ≥10 条时）

输出校准建议供用户确认，**不自动改 scout 文件**：

- 能力先验更新建议：实际赞数分布 vs scout 5.3 的「5–20 赞」先验；
- 分档阈值检查：T 档与实际排名的对应关系（如 T≤50 的题实际进前 5 的比例）。

用户确认后，再由 scout 流程修订其 5.3/5.4。

## 禁忌

- 只采集自己账号的数据，不抓他人回答内容；
- 问题页访问仅限复盘窗口内的题，不批量翻页（风控成本与 scout 一致）；
- 抓不到的数据如实标注缺失，不编造复盘数字；
- 校准建议必须经用户确认才落地，不擅自改 scout 的阈值和先验。
