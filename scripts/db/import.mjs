#!/usr/bin/env node
/**
 * 数据迁移：把现有 markdown / JSON / JSONL 导入 data/zhihu.db
 *
 * 原则：
 * 1. 只读源文件，绝不修改任何原始数据；
 * 2. 原始行全部存档到 raw_lines，解析失败也不丢内容；
 * 3. 每次运行全量重建 db（数据全部来自文件，天然幂等）；
 * 4. 解析不确定的行标记 parse_status / 记入报告，不猜数据。
 *
 * 用法：node scripts/db/import.mjs
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(repoRoot, "data/zhihu.db");
const schemaPath = path.join(repoRoot, "data/schema.sql");
const reportPath = path.join(repoRoot, "data/import-report.md");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_CELL_RE = /^(\d{4}-\d{2}-\d{2})(?:[（(].*?[）)])?$/;
const SOURCE_RE = /^(邀请|推荐|搜索|关注|热榜|画像推荐)$/;
const KIND_RE = /^(普通|带货|流量向)$/;
const QTYPE_RE = /^(知识|决策|求购|故事|情绪|生活|观点)(\d+(\.\d+)?)?$/;
const QUESTION_URL_RE = /zhihu\.com\/question\/(\d+)/;

/** 日期单元格归一：2026-10-15(2) / 2026-10-16(补) → 2026-10-15 / 2026-10-16 */
function normalizeDate(cell) {
  const m = String(cell ?? "").trim().match(DATE_CELL_RE);
  return m ? m[1] : null;
}

/** 在一行单元格里找问题 ID：支持纯数字 ID 和问题 URL 两种写法（首列也可能直接是 ID） */
function findQuestionId(cells) {
  for (let i = 0; i < cells.length; i += 1) {
    const c = cells[i];
    if (/^\d{5,20}$/.test(c)) return { id: c, idx: i };
    const m = c.match(QUESTION_URL_RE);
    if (m) return { id: m[1], idx: i };
  }
  return null;
}

/** 统计容器 */
const stats = {
  rawLines: 0,
  questions: { total: 0, parsed: 0, partial: 0 },
  reviews: 0,
  drafts: 0,
  geo: { matched: [], unmatched: [] },
  snapshots: 0,
  answers: 0,
  likers: 0,
  events: 0,
  skipped: [],
  unparsed: [],
  orphanDrafts: [],
  mergedRows: 0,
  poolRows: 0,
  topicTables: 0,
};

/**
 * "1.4万" / "8" / "1370" → 数字；非数字返回 null。
 * 上限 1e9：知乎问题的关注/浏览/回答/赞数不可能超过这个量级，
 * 而问题 ID 是 19 位数字（如 2075615222300201216），若被当成指标写入
 * INTEGER 列，读回时会超出 JS 安全整数范围直接抛 RangeError。
 */
const METRIC_MAX = 1e9;

function toNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d+)?)(万|w|W)?$/);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  const value = m[2] ? Math.round(n * 10000) : n;
  if (!Number.isFinite(value) || value < 0 || value > METRIC_MAX) return null;
  return value;
}

/** 剥离标题末尾全角括号备注，返回 {clean, note} */
function stripParenNote(title) {
  const m = title.match(/^(.*?)\s*（([^（）]*)）\s*$/);
  if (!m) return { clean: title.trim(), note: null };
  return { clean: m[1].trim(), note: m[2].trim() };
}

/** 由标题备注推断状态 */
function statusFromNote(note) {
  if (!note) return { status: "candidate", raw: null };
  if (note.includes("已弃选")) return { status: "dropped", raw: note };
  if (note.includes("已废弃")) return { status: "dropped", raw: note };
  if (note.includes("已选未答")) return { status: "selected", raw: note };
  if (note.includes("已答")) return { status: "drafted", raw: note };
  if (note.includes("本轮候选")) return { status: "candidate", raw: note };
  return { status: "candidate", raw: note };
}

/** 状态优先级，用于同日期合并 */
const STATUS_RANK = { dropped: 1, candidate: 2, selected: 3, drafted: 4, published: 5 };

/** 草稿平台 */
function platformOf(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith("百家号版-")) return "baijiahao";
  if (base.startsWith("公众号版-")) return "wechat";
  return "zhihu";
}

/** 草稿版本号 */
function versionOf(filePath) {
  const m = path.basename(filePath).match(/-v(\d+)\.md$/);
  return m ? Number(m[1]) : null;
}

/** 拆分同一行粘连的多条记录（`... || 2026-...`） */
function splitMergedRows(rawLine) {
  const segments = rawLine
    .split("||")
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.map((s) => (s.startsWith("|") ? s : `| ${s}`));
}

/** 行内单元格 */
function cellsOf(segment) {
  return segment
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * 分类一行表格。
 * 注意：有些问题行的末尾带「草稿已完成：xxx.md」备注，这类行仍是问题行，
 * 不能因为含 .md 就判成草稿行，否则问题本身不入库、草稿外键还会失败。
 */
function classifyRow(segment) {
  const cells = cellsOf(segment);
  const isSeparator = cells.every((c) => !c || /^-+$/.test(c));
  const isHeader = cells[0] === "日期" || cells.includes("问题ID");
  if (isSeparator || isHeader) return { type: "ignore", cells };
  if (cells.some((c) => /^复盘[（(：:]/.test(c))) return { type: "review", cells };
  const date = normalizeDate(cells[0]);
  const q = findQuestionId(cells);
  const hasMd = cells.some((c) => /\.md/.test(c));
  // 问题对应表的结构是「日期 | 草稿路径 | 问题URL | 描述 | 状态」，第二列即路径；
  // 必须先判成草稿，否则会被后面「有 ID 就是问题」的规则吞掉，草稿登记丢失。
  if (/\.md/.test(cells[1] ?? "")) return { type: "draft", cells };
  if (q && (date || !hasMd)) return { type: "question", cells, idIdx: q.idx, date, hasDraftNote: hasMd };
  if (hasMd) return { type: "draft", cells };
  return { type: "unknown", cells };
}

/** 解析问题行 */
function parseQuestion(cells, idIdx, date) {
  const questionId = cells[idIdx];
  const prefix = cells.slice(0, idIdx);
  const kind = prefix.find((c) => KIND_RE.test(c)) ?? null;
  const rest = cells.slice(idIdx + 1);
  const titleCell = rest.find(
    (c) =>
      c &&
      !SOURCE_RE.test(c) &&
      !KIND_RE.test(c) &&
      !/^\d{5,20}$/.test(c) &&
      !DATE_CELL_RE.test(c) &&
      !/\.md/.test(c) &&
      !QUESTION_URL_RE.test(c)
  );
  const source = cells.find((c) => SOURCE_RE.test(c)) ?? null;
  const { clean, note } = titleCell ? stripParenNote(titleCell) : { clean: null, note: null };
  const { status, raw: statusRaw } = statusFromNote(note);

  // 只有存在来源列时才按列位取指标：文件里有多种表格格式，
  // 没有来源列的表（如单题直答表）会让列位整体错位，宁可留空也不填错。
  const nums = [];
  let lastNewAnswer = null;
  let qType = null;
  if (source) {
    const srcIdx = cells.indexOf(source);
    for (let i = srcIdx + 1; i < cells.length; i += 1) {
      const cell = cells[i];
      if (!cell) continue;
      const cellDate = normalizeDate(cell);
      if (cellDate) {
        lastNewAnswer = cellDate;
        continue;
      }
      const n = toNumber(cell);
      if (n !== null) {
        nums.push(n);
        continue;
      }
      if (QTYPE_RE.test(cell) && !qType) qType = cell;
      else if (/^(活跃|常青)$/.test(cell) && !qType) qType = cell;
    }
  }

  return {
    questionId,
    title: clean,
    titleRaw: titleCell ?? null,
    firstSeen: date ?? normalizeDate(cells[0]),
    source,
    kind,
    qType,
    followCount: nums[0] ?? null,
    viewCount: nums[1] ?? null,
    answerCount: nums[2] ?? null,
    ratio: nums[3] ?? null,
    tScore: nums[4] ?? null,
    lastNewAnswer,
    status,
    statusRaw,
    parseStatus: clean && (date ?? normalizeDate(cells[0])) ? "ok" : "partial",
  };
}

/**
 * 解析复盘行。文件里有三种写法：
 *   「复盘：赞同 1，排名第 4/5」
 *   「复盘（2026-10-22 补录，7d+）：赞同 25 / 阅读 2976 / 藏 8 / 评 0 / 排名 >20（首屏未见）」
 *   「复盘（2026-10-28 回采，7d）：赞同 4 / 阅读 188 / 排名 >15」
 */
function parseReview(cells) {
  const questionId = cells.find((c) => /^\d{5,20}$/.test(c)) ?? null;
  const text = cells.join(" ");
  const upvotes = text.match(/赞同\s*(\d+)/);
  const rank = text.match(/排名\s*(?:第)?\s*([>＞]?\s*\d+)/);
  const total = text.match(/排名[^/]*\/\s*(\d+)/);
  const rankRaw = rank ? rank[1].replace(/\s/g, "") : null;
  return {
    questionId,
    text,
    upvotes: upvotes ? Number(upvotes[1]) : null,
    rank: rankRaw && !/^[>＞]/.test(rankRaw) ? Number(rankRaw) : null,
    rankRaw,
    total: total ? Number(total[1]) : null,
    date: normalizeDate(cells[0]),
  };
}

/** 解析草稿行 */
function parseDraftRow(cells) {
  const pathCell = cells.find((c) => /\.md/.test(c));
  if (!pathCell) return null;
  // 路径可能夹在「决策：D1×O3×M3×P2.0，草稿路径：话题/问题/xxx-v1.md」这类长文本里，
  // 也可能带「素材=」前缀；用字符集切出以 .md 结尾的片段，排除等号避免把前缀带进来。
  const candidates = pathCell.match(/[^\s，,。；;：:（）()「」=]+\.md/g) ?? [];
  const cleanPath = candidates.sort((a, b) => b.length - a.length)[0] ?? null;
  if (!cleanPath) return null;
  const questionId = findQuestionId(cells)?.id ?? null;
  const questionUrl =
    cells.find((c) => /https:\/\/www\.zhihu\.com\/question\/\d+/.test(c))?.match(
      /https:\/\/www\.zhihu\.com\/question\/\d+/
    )?.[0] ?? null;
  const date = normalizeDate(cells[0]);
  // 状态列只认以状态词开头的单元格，否则「草稿已完成：xxx.md」这类备注、
  // 甚至整段摘要都会被当成状态文本。
  const statusCell = cells.find((c) => /^(初稿|定稿|已发布|待发布)/.test(c)) ?? null;
  const summary =
    cells
      .filter(
        (c) =>
          c &&
          c !== pathCell &&
          c !== statusCell &&
          !/^\d{5,20}$/.test(c) &&
          !normalizeDate(c)
      )
      .sort((a, b) => b.length - a.length)[0] ?? null;

  let status = "draft";
  if (statusCell?.includes("已发布")) status = "published";
  else if (statusCell?.includes("定稿")) status = "ready";

  return {
    path: cleanPath,
    questionId,
    questionUrl,
    date,
    platform: platformOf(cleanPath),
    version: versionOf(cleanPath),
    summary,
    status,
    statusRaw: statusCell,
  };
}

/** 最长公共子串长度（用于 GEO 矩阵与草稿的归属匹配） */
function longestCommonSubstring(a, b) {
  let best = 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let last = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = last + 1;
        if (prev[j] > best) best = prev[j];
      } else {
        prev[j] = 0;
      }
      last = cur;
    }
  }
  return best;
}

/** 去空格与标点，便于跨格式匹配 */
function normalizeForMatch(text) {
  return text.replace(/[\s，,。；;：:、/|（）()「」《》\-—]/g, "");
}

/**
 * 解析一段关键词矩阵文本。实际格式是「核心词 xxx / yyy；延伸词 a、b；…」——
 * 类目后是空格而不是冒号；词条分隔符混用「/」和「、」，而价格词里的
 * 「$5/月」又是单位不是分隔，所以先按顿号切，只有切不出多条时才按斜杠切。
 */
function parseGeoMatrix(text) {
  const body = text.replace(/^关键词矩阵（GEO）：/, "").trim();
  const out = {};
  for (const part of body.split("；")) {
    const m = part.match(/^(核心词|延伸词|场景词|对比词|价格词|风险词)\s*[：:]?\s*(.*)$/);
    if (!m) continue;
    let terms = m[2]
      .split(/[、，]/)
      .map((s) => s.replace(/[。.]$/, "").trim())
      .filter(Boolean);
    if (terms.length === 1 && terms[0].includes("/")) {
      terms = terms[0]
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (terms.length) out[m[1]] = terms;
  }
  return out;
}

// ---------- 数据库操作 ----------

let db;
let stmts;

/**
 * 打开数据库。默认**不删库**，逐表 upsert——这样 add-question / add-review
 * 直接写进 db 的记录不会被下一次 sync 冲掉。需要从零重建时显式加 --reset。
 */
function openDb({ reset = false } = {}) {
  if (reset) {
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
  }
  db = new DatabaseSync(dbPath);
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  stmts = {
    insertRaw: db.prepare(
      `INSERT INTO raw_lines (source_file, line_no, kind, raw_line) VALUES (?, ?, ?, ?)
       ON CONFLICT(source_file, line_no) DO UPDATE SET kind = excluded.kind, raw_line = excluded.raw_line`
    ),
    getRawId: db.prepare("SELECT id FROM raw_lines WHERE source_file = ? AND line_no = ?"),
    getQuestion: db.prepare("SELECT * FROM questions WHERE question_id = ?"),
    insertQuestion: db.prepare(`INSERT INTO questions (
      question_id, title, title_raw, first_seen, last_seen, source, kind, q_type,
      follow_count, view_count, answer_count, ratio, t_score, last_new_answer,
      status, status_raw, parse_status, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    updateQuestion: db.prepare(`UPDATE questions SET
      title = ?, title_raw = ?, first_seen = ?, last_seen = ?, source = ?, kind = ?, q_type = ?,
      follow_count = ?, view_count = ?, answer_count = ?, ratio = ?, t_score = ?,
      last_new_answer = ?, status = ?, status_raw = ?, parse_status = ?, note = ?
      WHERE question_id = ?`),
    getDraft: db.prepare("SELECT * FROM drafts WHERE path = ?"),
    insertDraft: db.prepare(`INSERT INTO drafts (
      path, question_id, question_url, date, platform, version, summary, status,
      status_raw, geo_json, source_file, raw_line_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    updateDraft: db.prepare(`UPDATE drafts SET
      question_id = ?, question_url = ?, date = ?, platform = ?, version = ?, summary = ?,
      status = ?, status_raw = ?, geo_json = ?, source_file = ?, raw_line_id = ? WHERE path = ?`),
    upsertAnswer: db.prepare(`INSERT INTO answers (answer_url, question_id, published_at)
      VALUES (?, ?, ?)
      ON CONFLICT(answer_url) DO UPDATE SET
        question_id = COALESCE(excluded.question_id, answers.question_id),
        published_at = COALESCE(answers.published_at, excluded.published_at)`),
    insertSnapshot: db.prepare(`INSERT OR REPLACE INTO snapshots (
      snapshot_date, answer_url, reads, upvotes, comments, favorites, likes,
      positive_rate, rank, total_answers, source_json, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    getLiker: db.prepare("SELECT * FROM likers WHERE token = ?"),
    upsertLiker: db.prepare(`INSERT INTO likers (
      token, name, tier, first_seen, last_seen, last_grade, like_count,
      like_days_json, followers, voteups, answers, headline, ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      name = COALESCE(excluded.name, likers.name),
      tier = COALESCE(excluded.tier, likers.tier),
      first_seen = CASE WHEN likers.first_seen IS NULL THEN excluded.first_seen
                        WHEN excluded.first_seen IS NULL THEN likers.first_seen
                        WHEN excluded.first_seen < likers.first_seen THEN excluded.first_seen
                        ELSE likers.first_seen END,
      last_seen = COALESCE(excluded.last_seen, likers.last_seen),
      last_grade = COALESCE(excluded.last_grade, likers.last_grade),
      like_count = COALESCE(excluded.like_count, likers.like_count),
      like_days_json = COALESCE(excluded.like_days_json, likers.like_days_json),
      followers = COALESCE(excluded.followers, likers.followers),
      voteups = COALESCE(excluded.voteups, likers.voteups),
      answers = COALESCE(excluded.answers, likers.answers),
      headline = COALESCE(excluded.headline, likers.headline),
      ip = COALESCE(excluded.ip, likers.ip)`),
    insertEvent: db.prepare(
      "INSERT OR REPLACE INTO liker_events (event_date, token, action, detail_json) VALUES (?, ?, ?, ?)"
    ),
  };
}

/** 合并写入问题（多行同 ID 时保留更可信/更新的信息） */
function mergeQuestion(record, origin = "history") {
  if (origin === "history") stats.questions.total += 1;
  else stats.poolRows += 1;
  const existing = stmts.getQuestion.get(record.questionId);
  if (!existing) {
    stmts.insertQuestion.run(
      record.questionId,
      record.title ?? null,
      record.titleRaw ?? null,
      record.firstSeen,
      record.firstSeen,
      record.source ?? null,
      record.kind ?? null,
      record.qType ?? null,
      record.followCount ?? null,
      record.viewCount ?? null,
      record.answerCount ?? null,
      record.ratio ?? null,
      record.tScore ?? null,
      record.lastNewAnswer ?? null,
      record.status ?? "candidate",
      record.statusRaw ?? null,
      record.parseStatus ?? "ok",
      record.note ?? null
    );
    if (origin === "history") {
      if (record.parseStatus === "partial") stats.questions.partial += 1;
      else stats.questions.parsed += 1;
    }
    return;
  }

  const firstSeen =
    record.firstSeen && (!existing.first_seen || record.firstSeen < existing.first_seen)
      ? record.firstSeen
      : existing.first_seen;
  const lastSeen =
    record.firstSeen && (!existing.last_seen || record.firstSeen > existing.last_seen)
      ? record.firstSeen
      : existing.last_seen;

  // 同日期取优先级更高的状态；日期更晚则以新记录为准
  let status = existing.status;
  let statusRaw = existing.status_raw;
  if (record.statusRaw) {
    const newer = record.firstSeen && (!existing.last_seen || record.firstSeen >= existing.last_seen);
    const higherRank = (STATUS_RANK[record.status] ?? 0) >= (STATUS_RANK[existing.status] ?? 0);
    if (newer || higherRank) {
      status = record.status;
      statusRaw = record.statusRaw;
    }
  }

  stmts.updateQuestion.run(
    record.title ?? existing.title,
    record.titleRaw ?? existing.title_raw,
    firstSeen,
    lastSeen,
    record.source ?? existing.source,
    record.kind ?? existing.kind,
    record.qType ?? existing.q_type,
    record.followCount ?? existing.follow_count,
    record.viewCount ?? existing.view_count,
    record.answerCount ?? existing.answer_count,
    record.ratio ?? existing.ratio,
    record.tScore ?? existing.t_score,
    record.lastNewAnswer ?? existing.last_new_answer,
    status,
    statusRaw,
    existing.parse_status === "partial" && record.parseStatus === "partial" ? "partial" : "ok",
    existing.note,
    record.questionId
  );
}

function mergeDraft(record, rawLineId, sourceFile) {
  // 草稿行引用的 question 可能没有对应问题行（原文缺 ID 或问题行未解析），
  // 此时 question_id 置空并记录，避免外键约束中断整个迁移。
  const questionExists = record.questionId
    ? stmts.getQuestion.get(record.questionId) !== undefined
    : false;
  const questionId = questionExists ? record.questionId : null;
  if (record.questionId && !questionExists) {
    stats.orphanDrafts.push({ path: record.path, questionId: record.questionId });
  }
  const questionUrl =
    record.questionUrl ??
    (questionId ? `https://www.zhihu.com/question/${questionId}` : null);
  const origin = sourceFile ?? record.sourceFile ?? null;
  const existing = stmts.getDraft.get(record.path);
  if (!existing) {
    stmts.insertDraft.run(
      record.path,
      questionId,
      questionUrl,
      record.date ?? null,
      record.platform,
      record.version ?? null,
      record.summary ?? null,
      record.status ?? "draft",
      record.statusRaw ?? null,
      null,
      origin,
      rawLineId ?? null
    );
    stats.drafts += 1;
    return;
  }
  stmts.updateDraft.run(
    questionId ?? existing.question_id,
    questionUrl ?? existing.question_url,
    record.date ?? existing.date,
    record.platform ?? existing.platform,
    record.version ?? existing.version,
    record.summary ?? existing.summary,
    record.status ?? existing.status,
    record.statusRaw ?? existing.status_raw,
    existing.geo_json,
    origin ?? existing.source_file,
    rawLineId ?? existing.raw_line_id,
    record.path
  );
}

/** 归档一个 markdown 文件的全部行，并返回行号到 id 的映射 */
function archiveLines(sourceFile, lines) {
  const map = new Map();
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    let kind = "text";
    const t = line.trim();
    if (!t) kind = "blank";
    else if (t.startsWith("## ")) kind = "heading";
    else if (t.startsWith("<!--")) kind = "comment";
    else if (t.startsWith("关键词矩阵（GEO）")) kind = "geo_matrix";
    else if (t.startsWith("|")) kind = "table_row";
    stmts.insertRaw.run(sourceFile, lineNo, kind, line);
    const id = stmts.getRawId.get(sourceFile, lineNo).id;
    map.set(lineNo, id);
    stats.rawLines += 1;
  });
  return map;
}

// ---------- 各源导入 ----------

/** 选题历史.md */
function importSelectionHistory() {
  const rel = "outlines/选题历史.md";
  const lines = fs.readFileSync(path.join(repoRoot, rel), "utf8").split("\n");
  const lineIds = archiveLines(rel, lines);

  const geoTexts = [];
  // 有些表格段没有日期列（如「未答回捞」表，首列直接是问题 ID），
  // 用最近的 ### 标题日期作为这些行的日期。
  let sectionDate = null;
  lines.forEach((line, idx) => {
    const heading = line.match(/^#{1,3}\s+(\d{4}-\d{2}-\d{2})/);
    if (heading) sectionDate = heading[1];
    const t = line.trim();
    if (!t.startsWith("|")) return;
    const segments = splitMergedRows(t);
    if (segments.length > 1) stats.mergedRows += segments.length - 1;
    segments.forEach((segment) => {
      const parsed = classifyRow(segment);
      if (parsed.type === "question") {
        const q = parseQuestion(parsed.cells, parsed.idIdx, parsed.date ?? sectionDate);
        if (q.questionId) mergeQuestion(q, "history");
        else stats.unparsed.push({ file: rel, line: idx + 1, kind: "question-no-id", raw: segment });
        // 问题行末尾的「草稿已完成：xxx.md」备注也要登记成草稿
        if (parsed.hasDraftNote) {
          const d = parseDraftRow(parsed.cells);
          if (d) mergeDraft(d, lineIds.get(idx + 1));
        }
      } else if (parsed.type === "review") {
        const r = parseReview(parsed.cells);
        stats.reviews += 1;
        if (r.questionId) {
          const existing = stmts.getQuestion.get(r.questionId);
          if (existing) {
            const note = `复盘：赞同 ${r.upvotes ?? "?"}，排名 ${r.rankRaw}/${r.total}`;
            stmts.updateQuestion.run(
              existing.title, existing.title_raw, existing.first_seen, existing.last_seen,
              existing.source, existing.kind, existing.q_type, existing.follow_count,
              existing.view_count, existing.answer_count, existing.ratio, existing.t_score,
              existing.last_new_answer, "published", note, existing.parse_status, existing.note,
              r.questionId
            );
          } else {
            // 复盘行有 ID 但没有对应问题行：建占位问题，保证复盘数据不丢
            mergeQuestion(
              {
                questionId: r.questionId,
                title: null,
                titleRaw: null,
                firstSeen: r.date ?? sectionDate,
                source: null,
                kind: null,
                qType: null,
                followCount: null,
                viewCount: null,
                answerCount: null,
                ratio: null,
                tScore: null,
                lastNewAnswer: null,
                status: "published",
                statusRaw: `复盘：赞同 ${r.upvotes ?? "?"}`,
                parseStatus: "partial",
              },
              "history"
            );
          }
        }
      } else if (parsed.type === "draft") {
        const d = parseDraftRow(parsed.cells);
        if (d) mergeDraft(d, lineIds.get(idx + 1));
      } else if (parsed.type === "ignore") {
        // 表头与分隔行，正常跳过
      } else {
        stats.unparsed.push({ file: rel, line: idx + 1, kind: "unknown-row", raw: segment });
      }
    });
  });

  // 记录 GEO 矩阵文本（在问题对应表里使用，这里先收集选题历史中可能存在的）
  lines.forEach((line) => {
    if (line.trim().startsWith("关键词矩阵（GEO）")) geoTexts.push(line.trim());
  });
  return geoTexts;
}

/** 问题对应表.md：草稿登记 + GEO 矩阵归属 */
function importDraftTable() {
  const rel = "outlines/问题对应表.md";
  const lines = fs.readFileSync(path.join(repoRoot, rel), "utf8").split("\n");
  const lineIds = archiveLines(rel, lines);

  const geoTexts = [];
  lines.forEach((line, idx) => {
    const t = line.trim();
    if (t.startsWith("关键词矩阵（GEO）")) {
      geoTexts.push({ text: t, lineNo: idx + 1 });
      return;
    }
    if (!t.startsWith("|")) return;
    const segments = splitMergedRows(t);
    segments.forEach((segment) => {
      const parsed = classifyRow(segment);
      if (parsed.type === "draft") {
        const d = parseDraftRow(parsed.cells);
        if (d) mergeDraft(d, lineIds.get(idx + 1));
      }
    });
  });

  if (!geoTexts.length) return;

  // GEO 矩阵归属：矩阵「核心词」逐 token 与草稿文本（路径 + 描述摘要）算命中比例，
  // 再叠加「草稿目录段 vs 矩阵原文」的匹配比例——只看摘要时相近题（全球售价 / Siri AI）
  // 只差 0.01 分，加上目录段就能拉开。同主题的 v1/v2 重复登记视为同族，不算并列。
  const drafts = db.prepare("SELECT path, summary FROM drafts").all();

  const pathSegmentsOf = (p) =>
    p
      .split("/")
      .slice(0, -1)
      .map((s) => normalizeForMatch(s))
      .filter((s) => s.length >= 3);

  /** 草稿主题名：去掉平台前缀和版本号，用于识别同族草稿 */
  const topicOf = (p) =>
    path
      .basename(p)
      .replace(/\.md$/, "")
      .replace(/^(知乎回答|zhihu|百家号版|公众号版)-/, "")
      .replace(/-v\d+$/, "");

  const scoreDraft = (row, matrix, matrixNorm) => {
    const tokens = (matrix["核心词"] ?? [])
      .join(" ")
      .split(/[\s/、，,（）()]+/)
      .map((t) => normalizeForMatch(t))
      .filter((t) => t.length >= 2);
    let coreScore = 0;
    if (tokens.length) {
      const draftText = normalizeForMatch(`${row.path} ${row.summary ?? ""}`);
      coreScore =
        tokens.reduce((sum, t) => sum + longestCommonSubstring(t, draftText) / t.length, 0) /
        tokens.length;
    }
    const segScore = Math.max(
      0,
      ...pathSegmentsOf(row.path).map((s) => longestCommonSubstring(s, matrixNorm) / s.length)
    );
    return 0.6 * coreScore + 0.4 * segScore;
  };

  geoTexts.forEach((geo) => {
    const matrix = parseGeoMatrix(geo.text);
    if (!Object.keys(matrix).length) {
      stats.geo.unmatched.push({ lineNo: geo.lineNo, reason: "矩阵格式无法解析" });
      return;
    }

    const matrixNorm = normalizeForMatch(geo.text);
    const ranked = drafts
      .map((d) => ({ path: d.path, score: scoreDraft(d, matrix, matrixNorm) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const sameTopic = Boolean(second) && topicOf(best.path) === topicOf(second.path);
    const accepted =
      best && best.score >= 0.5 && (sameTopic || best.score - (second?.score ?? 0) >= 0.1);

    if (accepted) {
      const row = db.prepare("SELECT id, geo_json FROM drafts WHERE path = ?").get(best.path);
      const merged = { ...(row.geo_json ? JSON.parse(row.geo_json) : {}), ...matrix };
      db.prepare("UPDATE drafts SET geo_json = ? WHERE id = ?").run(JSON.stringify(merged), row.id);
      stats.geo.matched.push({
        lineNo: geo.lineNo,
        draft: best.path,
        score: `${best.score.toFixed(2)}${sameTopic ? "（同族合并）" : ""}`,
      });
    } else {
      stats.geo.unmatched.push({
        lineNo: geo.lineNo,
        reason: best
          ? `分数不足或领先不明显（最高 ${best.score.toFixed(2)}：${best.path}，次高 ${(second?.score ?? 0).toFixed(2)}：${second?.path ?? "无"}）`
          : "无候选草稿",
        text: geo.text.slice(0, 80),
      });
    }
  });
}

/**
 * 各话题目录下的 问题对应表.md：草稿登记的真实来源（当前 31 张表）。
 * 表内路径相对话题目录，必须补全话题前缀，才能与根表、选题历史里的同一草稿合并去重。
 */
function importTopicDraftTables() {
  const topics = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        !d.name.startsWith(".") &&
        d.name !== "node_modules" &&
        d.name !== "outlines" // 根目录汇总表单独处理，不能当话题表重复归档
    )
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(repoRoot, name, "问题对应表.md")));

  for (const topic of topics) {
    const rel = `${topic}/问题对应表.md`;
    const lines = fs.readFileSync(path.join(repoRoot, rel), "utf8").split("\n");
    const lineIds = archiveLines(rel, lines);
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (!t.startsWith("| 2026")) return;
      const draft = parseDraftRow(cellsOf(t));
      if (!draft) return;
      const fullPath = draft.path.startsWith(`${topic}/`) ? draft.path : `${topic}/${draft.path}`;
      mergeDraft({ ...draft, path: fullPath }, lineIds.get(idx + 1), rel);
    });
  }
  stats.topicTables = topics.length;
}

/** answers-*.json 快照 */
function importAnswerSnapshots() {
  // 历史快照在 analytics/，新采集的写到 data/raw/；两处都扫，同名文件只取先扫到的
  const dirs = [path.join(repoRoot, "data/raw"), path.join(repoRoot, "analytics")].filter((d) =>
    fs.existsSync(d)
  );
  const done = new Set();
  const pending = [];
  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir)) {
      if (!/^answers-\d{4}-\d{2}-\d{2}\.json$/.test(file) || done.has(file)) continue;
      done.add(file);
      pending.push({ dir, file });
    }
  }

  for (const { dir, file } of pending) {
    const rel = path.relative(repoRoot, path.join(dir, file));
    const snapshotDate = file.match(/(\d{4}-\d{2}-\d{2})/)[1];
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (err) {
      // 用户决定：损坏的文件直接跳过，保留原文件不动
      stats.skipped.push({ file: rel, reason: `JSON 解析失败：${err.message}` });
      continue;
    }
    const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : null;
    if (!items) {
      stats.skipped.push({ file: rel, reason: "无法识别的顶层结构（既不是数组也没有 items）" });
      continue;
    }

    for (const item of items) {
      const answerUrl = item.answerUrl ?? null;
      if (!answerUrl) {
        stats.skipped.push({ file: rel, reason: "存在缺少 answerUrl 的记录，整条跳过" });
        continue;
      }
      const publishedAt = normalizePublishedAt(item.publishedAt, snapshotDate);
      stmts.upsertAnswer.run(answerUrl, item.questionId ?? null, publishedAt);
      stmts.insertSnapshot.run(
        snapshotDate,
        answerUrl,
        item.reads ?? null,
        item.upvotes ?? null,
        item.comments ?? null,
        item.favorites ?? null,
        item.likes ?? null,
        item.positiveRate ?? null,
        item.rank ?? null,
        item.totalAnswers ?? null,
        item.source ? JSON.stringify(item.source) : item.audience ? JSON.stringify(item.audience) : null,
        JSON.stringify(item)
      );
      stats.snapshots += 1;
      stats.answers += 1;
    }
  }
}

/** "08-30" 这类无年份日期用快照年份补全 */
function normalizePublishedAt(value, snapshotDate) {
  if (!value) return null;
  const s = String(value).trim();
  if (DATE_RE.test(s)) return s;
  const m = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return s;
  const year = snapshotDate.slice(0, 4);
  return `${year}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}

/** followed-pool.jsonl */
function importFollowedPool() {
  // 新数据写 data/raw，历史文件在 analytics/；两处都读，按 question_id 幂等合并
  const candidates = ["data/raw/followed-pool.jsonl", "analytics/followed-pool.jsonl"];
  const paths = candidates.map((rel) => path.join(repoRoot, rel)).filter((p) => fs.existsSync(p));
  if (!paths.length) {
    stats.skipped.push({ file: candidates.join(" / "), reason: "文件不存在" });
    return;
  }
  const lines = paths
    .flatMap((p) => fs.readFileSync(p, "utf8").split("\n"))
    .filter((l) => l.trim());
  lines.forEach((line, idx) => {
    try {
      const rec = JSON.parse(line);
      if (!rec.id) return;
      mergeQuestion({
        questionId: String(rec.id),
        title: rec.title ?? null,
        titleRaw: rec.title ?? null,
        firstSeen: rec.date ?? null,
        source: "关注",
        kind: null,
        qType: null,
        followCount: rec.followers ?? null,
        viewCount: rec.views ?? null,
        answerCount: rec.answers ?? null,
        ratio: null,
        tScore: null,
        lastNewAnswer: null,
        status: "candidate",
        statusRaw: null,
        parseStatus: "ok",
      }, "pool");
    } catch (err) {
      stats.skipped.push({ file: rel, reason: `第 ${idx + 1} 行解析失败：${err.message}` });
    }
  });
}

/** liker-scan：seen-users.json + raw-*.json + engage-*.json（新数据在 data/raw，历史在 analytics） */
function importLikerScan() {
  const dirs = [
    path.join(repoRoot, "data/raw/liker-scan"),
    path.join(repoRoot, "analytics/liker-scan"),
  ].filter((d) => fs.existsSync(d));
  if (!dirs.length) {
    stats.skipped.push({ file: "liker-scan", reason: "目录不存在" });
    return;
  }
  for (const dir of dirs) importLikerScanFrom(dir);
}

function importLikerScanFrom(dir) {
  const seenPath = path.join(dir, "seen-users.json");
  if (fs.existsSync(seenPath)) {
    const seen = JSON.parse(fs.readFileSync(seenPath, "utf8"));
    for (const [token, rec] of Object.entries(seen)) {
      stmts.upsertLiker.run(
        token,
        null,
        null,
        rec.firstSeen ?? null,
        rec.lastSeen ?? null,
        rec.lastGrade ?? null,
        rec.likeCount ?? null,
        rec.likeDays ? JSON.stringify(rec.likeDays) : null,
        null,
        null,
        null,
        null,
        null
      );
      stats.likers += 1;
    }
  }

  const rawFiles = fs.readdirSync(dir).filter((f) => /^raw-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  for (const file of rawFiles) {
    const date = file.match(/(\d{4}-\d{2}-\d{2})/)[1];
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const thanked = new Set(data.thankedTokens ?? []);
    for (const u of data.users ?? []) {
      if (!u.token) continue;
      stmts.upsertLiker.run(
        u.token,
        u.name ?? null,
        null,
        u.firstSeenDate ?? date,
        date,
        null,
        null,
        u.likeDays ? JSON.stringify(u.likeDays) : null,
        u.followers ?? null,
        u.voteups ?? null,
        u.answers ?? null,
        u.headline ?? null,
        u.ip ?? null
      );
      if (thanked.has(u.token)) {
        stmts.insertEvent.run(date, u.token, "thanked", JSON.stringify({ liked: u.liked ?? [] }));
        stats.events += 1;
      }
    }
  }

  const engageFiles = fs.readdirSync(dir).filter((f) => /^engage-\d{4}-\d{2}-\d{2}/.test(f));
  for (const file of engageFiles) {
    const date = file.match(/(\d{4}-\d{2}-\d{2})/)[1];
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const r of data.results ?? []) {
      if (!r.token) continue;
      if (r.tier || r.name) {
        const existing = stmts.getLiker.get(r.token);
        stmts.upsertLiker.run(
          r.token,
          r.name ?? existing?.name ?? null,
          r.tier ?? existing?.tier ?? null,
          existing?.first_seen ?? date,
          date,
          existing?.last_grade ?? null,
          existing?.like_count ?? null,
          existing?.like_days_json ?? null,
          existing?.followers ?? null,
          existing?.voteups ?? null,
          existing?.answers ?? null,
          existing?.headline ?? null,
          existing?.ip ?? null
        );
      }
      if (Array.isArray(r.voted) && r.voted.length) {
        stmts.insertEvent.run(
          date,
          r.token,
          "voted",
          JSON.stringify({ votesTarget: r.votesTarget ?? null, items: r.voted })
        );
        stats.events += 1;
      }
    }
  }
}

// ---------- 主流程 ----------

function main() {
  const reset = process.argv.includes("--reset");
  openDb({ reset });
  db.exec("BEGIN");
  try {
    importSelectionHistory();
    importDraftTable();
    importTopicDraftTables();
    importAnswerSnapshots();
    importFollowedPool();
    importLikerScan();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const counts = {
    questions: db.prepare("SELECT COUNT(*) AS n FROM questions").get().n,
    drafts: db.prepare("SELECT COUNT(*) AS n FROM drafts").get().n,
    snapshots: db.prepare("SELECT COUNT(*) AS n FROM snapshots").get().n,
    answers: db.prepare("SELECT COUNT(*) AS n FROM answers").get().n,
    likers: db.prepare("SELECT COUNT(*) AS n FROM likers").get().n,
    events: db.prepare("SELECT COUNT(*) AS n FROM liker_events").get().n,
    rawLines: db.prepare("SELECT COUNT(*) AS n FROM raw_lines").get().n,
    geoDrafts: db.prepare("SELECT COUNT(*) AS n FROM drafts WHERE geo_json IS NOT NULL").get().n,
  };
  db.close();

  const report = `# 迁移报告

生成时间：${new Date().toISOString()}
数据源：只读导入，未修改任何原始文件
数据库：\`data/zhihu.db\`（已加入 .gitignore，不入库）

## 一、表计数

| 表 | 行数 |
|----|------|
| questions | ${counts.questions} |
| drafts | ${counts.drafts} |
| snapshots | ${counts.snapshots} |
| answers | ${counts.answers} |
| likers | ${counts.likers} |
| liker_events | ${counts.events} |
| raw_lines | ${counts.rawLines} |

带 GEO 关键词矩阵的草稿：${counts.geoDrafts} 篇

## 二、选题历史解析

- 选题历史记录行（拆分粘连后）：${stats.questions.total}
- 结构化成功：${stats.questions.parsed}
- 部分解析（缺标题或缺日期）：${stats.questions.partial}
- 复盘行：${stats.reviews}
- 草稿行：${stats.drafts}
- 粘连行拆分：${stats.mergedRows}
- followed-pool 导入行：${stats.poolRows}
- 话题级问题对应表：${stats.topicTables} 张

## 三、answers 快照

- 成功导入快照记录：${stats.snapshots}

## 四、GEO 矩阵归属

${stats.geo.matched.map((m) => `- 第 ${m.lineNo} 行 → \`${m.draft}\`（匹配分 ${m.score}）`).join("\n") || "- 无"}

${stats.geo.unmatched.length ? `\n未匹配：\n\n${stats.geo.unmatched.map((u) => `- 第 ${u.lineNo} 行：${u.reason}${u.text ? `｜${u.text}` : ""}`).join("\n")}` : ""}

## 五、跳过与异常

${stats.skipped.length ? stats.skipped.map((s) => `- \`${s.file}\`：${s.reason}`).join("\n") : "- 无"}

## 六、未结构化行

${stats.unparsed.length ? stats.unparsed.slice(0, 30).map((u) => `- \`${u.file}\` 第 ${u.line} 行（${u.kind}）：\`${u.raw.slice(0, 120)}\``).join("\n") : "- 无"}
${stats.unparsed.length > 30 ? `\n……共 ${stats.unparsed.length} 条，仅列前 30` : ""}

## 七、悬空草稿引用（问题行缺失，question_id 已置空）

${stats.orphanDrafts.length ? stats.orphanDrafts.map((o) => `- \`${o.path}\`：引用问题 ${o.questionId}`).join("\n") : "- 无"}
`;

  fs.writeFileSync(reportPath, report, "utf8");

  console.log("导入完成：");
  console.table(counts);
  console.log(`报告：${reportPath}`);
  if (stats.skipped.length) {
    console.log("\n跳过的文件：");
    stats.skipped.forEach((s) => console.log(`  - ${s.file}: ${s.reason}`));
  }
}

main();
