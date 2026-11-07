-- 知乎内容工作区数据底座 schema
-- 设计原则：
-- 1. 原始行逐行存档（raw_lines），任何解析失败都不丢内容；
-- 2. 结构化表只做「尽力解析」，parse_status 标注可信度；
-- 3. 本文件是唯一 schema 来源，import.mjs 每次全量重建。

PRAGMA foreign_keys = ON;

-- 原始数据行：选题历史.md / 问题对应表.md 的每一行原文
CREATE TABLE IF NOT EXISTS raw_lines (
  id          INTEGER PRIMARY KEY,
  source_file TEXT    NOT NULL,
  line_no     INTEGER NOT NULL,
  kind        TEXT    NOT NULL,  -- heading|comment|table_row|geo_matrix|text|blank
  raw_line    TEXT    NOT NULL,
  UNIQUE (source_file, line_no)
);

-- 知乎问题主表（选题历史 + followed-pool 合并）
CREATE TABLE IF NOT EXISTS questions (
  question_id  TEXT PRIMARY KEY,
  title        TEXT,
  title_raw    TEXT,
  first_seen   TEXT NOT NULL,
  last_seen    TEXT,
  source       TEXT,             -- 邀请|推荐|搜索|关注|热榜
  kind         TEXT,             -- 普通|带货
  q_type       TEXT,             -- 知识|决策|求购|活跃|常青
  follow_count INTEGER,
  view_count   INTEGER,
  answer_count INTEGER,
  ratio        REAL,             -- 浏览÷回答
  t_score      INTEGER,          -- 第 5 名赞数
  last_new_answer TEXT,          -- 最近新答日期
  status       TEXT NOT NULL DEFAULT 'candidate',
                                 -- candidate|selected|dropped|drafted|published
  status_raw   TEXT,             -- 标题括号里的原始状态备注
  parse_status TEXT NOT NULL DEFAULT 'ok',  -- ok|partial
  note         TEXT
);

-- 草稿登记（问题对应表 + 选题历史中的草稿行）
CREATE TABLE IF NOT EXISTS drafts (
  id           INTEGER PRIMARY KEY,
  path         TEXT UNIQUE NOT NULL,   -- 仓库相对路径（话题表的相对路径已补全话题前缀）
  question_id  TEXT REFERENCES questions(question_id),
  question_url TEXT,
  date         TEXT,
  platform     TEXT,                   -- zhihu|baijiahao|wechat
  version      INTEGER,
  summary      TEXT,
  status       TEXT,                   -- draft|ready|published
  status_raw   TEXT,
  geo_json     TEXT,                   -- 关键词矩阵（GEO）{核心词:[...],延伸词:[...],...}
  source_file  TEXT,                   -- 登记来源：outlines/问题对应表.md 或 <话题>/问题对应表.md
  raw_line_id  INTEGER REFERENCES raw_lines(id)
);

-- 回答与每日快照
CREATE TABLE IF NOT EXISTS answers (
  answer_url   TEXT PRIMARY KEY,
  question_id  TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_date  TEXT NOT NULL,
  answer_url     TEXT NOT NULL,
  reads          INTEGER,
  upvotes        INTEGER,
  comments       INTEGER,
  favorites      INTEGER,
  likes          INTEGER,
  positive_rate  TEXT,
  rank           INTEGER,
  total_answers  INTEGER,
  source_json    TEXT,           -- Audience.Source 流量来源分布
  raw_json       TEXT NOT NULL,  -- 原始记录整条兜底
  PRIMARY KEY (snapshot_date, answer_url)
);

-- 互动用户（liker-scan）
CREATE TABLE IF NOT EXISTS likers (
  token          TEXT PRIMARY KEY,
  name           TEXT,
  tier           TEXT,
  first_seen     TEXT,
  last_seen      TEXT,
  last_grade     TEXT,
  like_count     INTEGER,
  like_days_json TEXT,
  followers      INTEGER,
  voteups        INTEGER,
  answers        INTEGER,
  headline       TEXT,
  ip             TEXT
);

-- 互动事件（回赞 / 答谢）
CREATE TABLE IF NOT EXISTS liker_events (
  event_date TEXT NOT NULL,
  token      TEXT NOT NULL,
  action     TEXT NOT NULL,      -- voted|thanked
  detail_json TEXT,
  PRIMARY KEY (event_date, token, action)
);

-- 每个回答的最新一次快照
CREATE VIEW IF NOT EXISTS v_latest_snapshot AS
SELECT s.*
FROM snapshots s
WHERE s.snapshot_date = (
  SELECT MAX(snapshot_date) FROM snapshots WHERE answer_url = s.answer_url
);

-- 问题索引：一眼看到是否答过、有哪些草稿
CREATE VIEW IF NOT EXISTS v_question_index AS
SELECT q.question_id,
       q.title,
       q.first_seen,
       q.last_seen,
       q.source,
       q.kind,
       q.status,
       q.status_raw,
       (SELECT GROUP_CONCAT(d.path, ' | ') FROM drafts d WHERE d.question_id = q.question_id) AS drafts
FROM questions q;
