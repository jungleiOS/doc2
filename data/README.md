# 数据底座（data/）

知乎内容工作区的本地数据库。草稿登记、选题历史、回答表现、互动用户全部入库，可 SQL 查询。

## 文件

| 文件 | 作用 | 是否入库 |
|------|------|----------|
| `schema.sql` | 表结构，唯一 schema 来源 | ✅ |
| `zhihu.db` | 本地数据库文件 | ❌ 已 gitignore |
| `import-report.md` | 最近一次迁移报告（计数、跳过项、GEO 归属、未结构化行） | ✅ |
| `dump.sql` | 按需备份产物 | ❌ 已 gitignore |
| `render-preview/` | 渲染预览输出 | ❌ 已 gitignore |

数据全部来自仓库里的 md / json，任何时候都能重建，所以 db 与 dump 都不入库。

## 命令

```bash
# 一条命令：导入 + 渲染 + 校验（日常改完话题级问题对应表后跑这个）
node scripts/db/sync.mjs

# 分步
node scripts/db/import.mjs            # 增量导入（不删库，新写入的记录不会被冲掉）
node scripts/db/import.mjs --reset    # 从零重建（慎用，会丢掉只存在于 db 的记录）
node scripts/db/render.mjs --write    # 只渲染
node scripts/db/render.mjs --check    # 校验 md 与 db 一致

# 新增草稿登记（写 db 并自动重渲染）
node scripts/db/add-draft.mjs \
  --path "话题/问题/知乎回答-主题-v1.md" \
  --question-url "https://www.zhihu.com/question/123456789" \
  --summary "一句话描述" --status "初稿待发布"

# 新增选题
node scripts/db/add-question.mjs --id 2094037238065714517 \
  --title "如何看待……？" --source 邀请 --follow 8 --view 1200 --answers 3 --t 5 --status selected

# 回写复盘
node scripts/db/add-review.mjs --id 2094037238065714517 --upvotes 25 --rank 3 --total 5

# 按关键词查（不用记问题 ID）
node scripts/db/lookup.mjs 充电宝
node scripts/db/lookup.mjs 平板 --recent 30
node scripts/db/lookup.mjs --status drafted

# 备份 / 查询
sqlite3 data/zhihu.db .dump > data/dump.sql
sqlite3 data/zhihu.db
```

> `import.mjs` 默认**增量 upsert**，所以三个 `add-*.mjs` 直接写进 db 的记录不会被下一次 `sync` 冲掉；只有显式 `--reset` 才会从零重建。

## 目录分工

| 目录 | 放什么 | 入库 |
|------|--------|------|
| `data/raw/` | **机器采集的原始数据**：`answers-*.json`、`liker-scan/*.json`、`scout-raw/run-*.json`、`followed-pool.jsonl` | ❌ gitignore |
| `analytics/` | **人读的报告**：`liker-scan/report-*.md`、`选题画像.md`、带货/选题复盘 md | ✅ |
| `outlines/` | 人工登记源（`选题历史.md`）+ 生成物（总表、看板） | ✅ |

采集类 skill（tracker / scout / liker-scan）现在全部写 `data/raw/`，跑完自动提示 `sync`；工程目录不再堆 json。

## 数据源与生成物

**人工登记源**（可以手改）：

- 各话题目录下的 `<话题>/问题对应表.md`（当前 31 张，草稿登记的真实来源）
- `outlines/选题历史.md`（选题流水账）

**生成物**（禁止手改）：

- `outlines/问题对应表.md` — 全部草稿按话题汇总的总表（160+ 条）
- `outlines/选题看板.md` — 选题池状态、已起草待发布、各回答最新表现、已弃选

## 表结构

- `raw_lines`：所有 md 的**逐行原文存档**，任何解析失败都不丢内容
- `questions`：问题主表（选题历史 + followed-pool 合并），`parse_status` 标注解析可信度
- `drafts`：草稿登记，`source_file` 记来源表，`geo_json` 存 GEO 关键词矩阵
- `answers` / `snapshots`：回答与每日表现快照（每个回答保留多期）
- `likers` / `liker_events`：liker-scan 的互动用户与回赞/答谢事件
- 视图 `v_latest_snapshot`（每个回答最新一期）、`v_question_index`（问题 + 关联草稿）

## 常用查询

**日常查东西用 `lookup.mjs`，按标题关键词搜，不需要问题 ID：**

```bash
node scripts/db/lookup.mjs 充电宝        # 答过的题排在前面，候选折叠显示
node scripts/db/lookup.mjs 折叠屏 --recent 30
```

输出分三段：**答过的（重点）**、**还没答的候选**、**草稿**。

`add-question.mjs` / `add-review.mjs` 里的 `--id` 是给脚本的参数，正常由 skill 从抓到的知乎链接里自动填入，人不用记。

需要更精确的统计时再用 SQL：

```sql
-- 某题是否答过、有哪些草稿
SELECT * FROM v_question_index WHERE question_id = '2094037238065714517';

-- 状态分布（选题池健康度）
SELECT status, COUNT(*) FROM questions GROUP BY status ORDER BY 2 DESC;

-- 全部草稿按话题计数
SELECT substr(path, 1, instr(path, '/') - 1) AS 话题, COUNT(*) AS 篇数
FROM drafts GROUP BY 1 ORDER BY 2 DESC;

-- 各月发布回答的最终快照表现（校准 D×O×M 先验）
SELECT substr(a.published_at,1,7) AS 月份,
       COUNT(*) AS 篇数,
       ROUND(AVG(s.reads),0) AS 均阅读,
       ROUND(AVG(s.upvotes),1) AS 均赞同
FROM answers a
JOIN snapshots s ON s.answer_url = a.answer_url
WHERE s.snapshot_date = (SELECT MAX(snapshot_date) FROM snapshots WHERE answer_url = a.answer_url)
GROUP BY 1 ORDER BY 1;

-- 带 GEO 矩阵的草稿
SELECT path, geo_json FROM drafts WHERE geo_json IS NOT NULL;

-- 原始行回溯（解析失败时用）
SELECT raw_line FROM raw_lines WHERE source_file = 'outlines/选题历史.md' AND line_no = 875;
```

## 已知限制

- `analytics/answers-2026-09-08.json` 是损坏的 JSON（标题内的引号未转义），整份跳过，原文件未改动，报告里有记录。
- `选题历史.md` 至少有四种表格格式（主表 / 无类型列 / 单题直答 / 无日期回捞表），解析器按「日期 + 问题 ID」或「首列 ID + 段落标题日期」兜底；仍有极少数无 ID 无日期的行只进 `raw_lines`，见报告「未结构化行」。
- 话题级问题对应表有两种列序（草稿列在问题链接前或后），解析按「含 .md 的单元格」定位，与列序无关。
- GEO 矩阵归属用「核心词 + 路径段」双特征匹配，阈值 0.5、领先 0.1；同主题 v1/v2 视为同族合并。当前 6/6 命中，归属结果在报告里逐条可查。

## 当前进度

- 第 1 步（只读迁移）：完成，db 可查，原始 md/json 未改动。
- 第 2 步（渲染）：完成。`outlines/问题对应表.md`（草稿总表）与 `outlines/选题看板.md` 已切换为 db 渲染产物，`render.mjs --check` 全绿。
- 第 3 步（结构化写入）：完成。`add-draft.mjs` / `add-question.mjs` / `add-review.mjs` 三个命令直接写 db，`import.mjs` 改为增量 upsert，新写入不会被 sync 冲掉。
- `outlines/选题历史.md` 仍是手写叙事源（流水账、入选理由、撞题说明），db 只读取其中的可计算字段；scout 与 tracker 的写回已改为「md 叙事 + db 结构化字段」双写。
