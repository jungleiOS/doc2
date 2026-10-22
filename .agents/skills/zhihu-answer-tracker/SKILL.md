---
name: zhihu-answer-tracker
description: 用知乎官方开放平台（zhihu-cli）采集自己已发布回答的表现数据（阅读/赞同/评论/收藏/喜欢 + Audience 来源），对照 outlines/选题历史.md 识别处于 24h/7d 复盘窗口的回答，回写复盘行（问题页排名仍用 ego-browser 抓），为 zhihu-question-scout 的 5.4 校准回路供数。当用户说「回采」「复盘」「采集我的回答数据」「看看我的回答表现」时触发。
---

# 知乎回答数据追踪（zhihu-answer-tracker）

定位：zhihu-question-scout **5.4 校准回路的数据采集端**。回答由用户手动发布后，本 skill 把表现数据拿回来、写回 `outlines/选题历史.md`，攒够样本后输出校准建议。

## 0. 数据采集通道（2026-10-22 切换：官方 API 为主，浏览器为辅助）

主通道 **知乎官方 CLI**（skill `zhihu`，凭证存 Keychain，不依赖浏览器登录态）：

```bash
CLI="$HOME/Library/Application Support/zhihu-cli/current/zhihu-cli"
```

- 账号级统计（粉丝画像、Audience 来源分布）：`"$CLI" me stats --type answer`
- 回答列表：`"$CLI" me contents --type answer --sort ts --order desc --offset 0 --limit 50`（`--offset` 翻页，覆盖最近 30 天即可停）
- 单篇五指标：`"$CLI" me content-stats --content-url '<回答URL>'`（`Data.Items[0].Metrics`）

额度：`creator` 创作能力组 500 次/自然日（`"$CLI" quota` 可查），一次回采 ≤5 篇 content-stats，远够用。CLI 不可用（网络/凭证失效）时才降级用 ego-browser 走创作中心（§2 旧通道），并在输出里注明数据来源。

## 1. 浏览器通道检查（仅抓排名时需要）

问题页排名**只能去问题页抓**，这一步仍用 **ego-browser**（task space 名 `zhihu-tracker`）：

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("zhihu-tracker");
const page = task.page("p1");
await page.goto("https://www.zhihu.com/creator/manage/creation/all");
await page.waitForTimeout(3000);
console.log(await page.title());
EOF
```

返回登录墙则提示用户先在浏览器登录知乎。若本轮无处于复盘窗口的题，可整轮不启动浏览器。

## 2. 采集回答数据（主数据，官方 CLI）

两步：

1. **列表**：`me contents --type answer --sort ts --order desc`，翻页到覆盖最近 30 天发布。每条取 `Url`（answerUrl）、`CreatedAt`（Unix 秒，转 YYYY-MM-DD）、`Title`。
2. **单篇指标**：对最近 30 天内的每篇跑 `me content-stats --content-url <Url>`，从 `Data.Items[0].Metrics` 映射五指标：`ViewCount`→reads、`UpvoteCount`→upvotes、`CommentCount`→comments、`CollectCount`→favorites、`LikeCount`→likes。顺带可记录 `PositiveInteractionRate` 和 `Audience.Source`（流量来源分布），供校准输出引用。

每条产出固定字段（与历史快照格式兼容）：

```json
{"questionTitle":"…","questionUrl":"…","answerUrl":"…","publishedAt":"2026-08-29","reads":0,"upvotes":0,"comments":0,"favorites":0,"likes":0}
```

- `questionUrl`/`questionTitle`：优先取问题链接；CLI 返回不含问题 URL 时，从 `me contents` 的 `Title`/`Summary` 或选题历史.md 按 answerUrl 反查匹配。
- **首次切换后必须抽 1-2 篇与知乎 App/创作中心人工核对**（防止字段映射错，如把 LikeCount 当 UpvoteCount）；核对结论回写本节。
- 指标缺失如实标注（`Metrics` 里没有的字段不补零不推导）；CLI 返回 `Code != 0` 时按 Message 报告，不编造。

## 3. 存快照

写入 `analytics/answers-<YYYY-MM-DD>.json`（目录不存在则创建）。同日重复采集覆盖同名文件；不同日期的快照全部保留，形成时间序列——快照是能力先验分析的原始数据，不删不合并。

## 4. 识别复盘窗口并回写

读 `outlines/选题历史.md`，按问题 ID（questionUrl 中的数字）与快照匹配：

- 发布满 24h 且该题无复盘行 → 写 24h 数据；
- 发布满 7d → **就地更新同一复盘行**的 7d 数据，不重复加行；
- 复盘行格式（与 scout 第 7 步一致）：来源列写「复盘」，标题列写「24h 赞同 x / 7d 赞同 x / 排名 x/N」。

**排名只能去问题页抓**：仅对处于复盘窗口的题逐个打开（一轮通常 ≤3 个），navigate → sleep 3 秒 → 按开头句或用户名定位自己的回答，数默认排序下的位次；不在前 20 条记「排名 >20」。赞数等五指标以 CLI content-stats 为准，不从问题页重复抓。

## 5. 校准输出（复盘行 ≥10 条时）

输出校准建议供用户确认，**不自动改 scout 文件**：

- 能力先验更新建议：实际赞数分布 vs scout 5.3 的「5–20 赞」先验；
- 分档阈值检查：T 档与实际排名的对应关系（如 T≤50 的题实际进前 5 的比例）；
- **流量来源结构**（2026-10-22 起新增，`me stats` / `content-stats` 的 `Audience.Source`）：各题阅读来自搜索/推荐/热榜/PC 的比例，检验 scout「常青搜索题 vs 活跃推荐题」的 D 分档假设，发现「搜索占比高但 D 被打低」的系统性偏差时提出修订建议。

用户确认后，再由 scout 流程修订其 5.3/5.4。

## 禁忌

- 只采集自己账号的数据，不抓他人回答内容；
- 问题页访问仅限复盘窗口内的题，不批量翻页（风控成本与 scout 一致）；
- 抓不到的数据如实标注缺失，不编造复盘数字；
- 校准建议必须经用户确认才落地，不擅自改 scout 的阈值和先验。
