#!/usr/bin/env node
/**
 * 人类友好的查询入口：按标题 / 话题关键词查，不用记问题 ID。
 *
 * 用法：
 *   node scripts/db/lookup.mjs 充电宝
 *   node scripts/db/lookup.mjs 平板 --recent 30
 *   node scripts/db/lookup.mjs --status drafted
 *
 * 关键词同时匹配：问题标题、草稿路径、草稿描述摘要。
 */

import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(repoRoot, "data/zhihu.db");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    recent: { type: "string" },
    status: { type: "string" },
    limit: { type: "string", default: "20" },
  },
});

const keyword = positionals.join(" ").trim();
if (!keyword && !values.status) {
  console.error("用法：node scripts/db/lookup.mjs <关键词> [--recent 30] [--status drafted]");
  console.error("例：node scripts/db/lookup.mjs 充电宝");
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("data/zhihu.db 不存在，先运行 node scripts/db/import.mjs");
  process.exit(1);
}

const STATUS_LABEL = {
  candidate: "候选",
  selected: "已选未答",
  drafted: "已起草",
  published: "已发布",
  dropped: "已弃选",
};

const like = `%${keyword}%`;
const limit = Number.parseInt(values.limit, 10) || 20;
const since = values.recent
  ? new Date(Date.now() - Number(values.recent) * 86400000).toLocaleDateString("sv-SE")
  : null;

const db = new DatabaseSync(dbPath, { readOnly: true });

// 排序优先级：答过的题永远排在候选前面，候选太多时只展示前几条
const questions = db
  .prepare(
    `SELECT q.question_id, q.title, q.status, q.first_seen, q.last_seen,
            (SELECT COUNT(*) FROM drafts d WHERE d.question_id = q.question_id) AS draft_count
     FROM questions q
     WHERE (? = '' OR q.title LIKE ?)
       AND (? IS NULL OR COALESCE(q.last_seen, q.first_seen) >= ?)
       AND (? IS NULL OR q.status = ?)
     ORDER BY CASE q.status
                WHEN 'published' THEN 0 WHEN 'drafted' THEN 1 WHEN 'selected' THEN 2
                WHEN 'candidate' THEN 3 ELSE 4 END,
              COALESCE(q.last_seen, q.first_seen) DESC
     LIMIT 100`
  )
  .all(keyword, like, since, since, values.status ?? null, values.status ?? null);

const drafts = db
  .prepare(
    `SELECT date, path, status_raw, question_url
     FROM drafts
     WHERE (path LIKE ? OR summary LIKE ?)
       AND (? IS NULL OR date >= ?)
     ORDER BY date DESC
     LIMIT ?`
  )
  .all(like, like, since, since, limit);

db.close();

const label = (s) => STATUS_LABEL[s] ?? s ?? "";
const answered = questions.filter((q) => ["published", "drafted", "selected"].includes(q.status));
const candidates = questions.filter((q) => q.status === "candidate");
const shownCandidates = candidates.slice(0, 5);
const hiddenCandidates = candidates.length - shownCandidates.length;

console.log(`# 搜索「${keyword || "（按状态）"}」：匹配问题 ${questions.length} 条，草稿 ${drafts.length} 条\n`);

if (answered.length) {
  console.log("## 答过的（重点看这里）\n");
  for (const q of answered) {
    const title = (q.title ?? "（无标题）").slice(0, 60);
    const draftsNote = q.draft_count > 0 ? `（草稿 ${q.draft_count} 篇）` : "";
    console.log(`- [${label(q.status)}] ${title}${draftsNote}｜首次 ${q.first_seen ?? "?"}`);
  }
  console.log("");
}

if (shownCandidates.length) {
  console.log("## 还没答的候选\n");
  for (const q of shownCandidates) {
    const title = (q.title ?? "（无标题）").slice(0, 60);
    const draftsNote = q.draft_count > 0 ? `（草稿 ${q.draft_count} 篇）` : "";
    console.log(`- ${title}${draftsNote}｜首次 ${q.first_seen ?? "?"}`);
  }
  if (hiddenCandidates > 0) {
    console.log(`\n……另有 ${hiddenCandidates} 条候选，关键词再具体些，或加 --limit 数量。`);
  }
  console.log("");
}

if (drafts.length) {
  console.log("## 草稿\n");
  for (const d of drafts) {
    const status = d.status_raw ? `（${d.status_raw.slice(0, 30)}）` : "";
    console.log(`- ${d.date ?? "?"} ${d.path} ${status}`);
  }
  console.log("");
}

if (!questions.length && !drafts.length) {
  console.log("没找到。换个更短的关键词试试（比如「充电」「平板」「AI」）。");
}
