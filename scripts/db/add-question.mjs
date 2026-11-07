#!/usr/bin/env node
/**
 * 新增/更新一条选题记录：写 data/zhihu.db，随后刷新选题看板。
 *
 * 用法：
 *   node scripts/db/add-question.mjs \
 *     --id 2094037238065714517 \
 *     --title "如何看待……？" \
 *     --source 邀请 \
 *     [--date 2026-11-05] [--kind 普通] [--follow 8] [--view 1200] \
 *     [--answers 3] [--t 5] [--q-type 知识2.0] [--status candidate]
 */

import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(repoRoot, "data/zhihu.db");

const { values } = parseArgs({
  options: {
    id: { type: "string" },
    title: { type: "string" },
    source: { type: "string" },
    date: { type: "string" },
    kind: { type: "string" },
    follow: { type: "string" },
    view: { type: "string" },
    answers: { type: "string" },
    t: { type: "string" },
    "q-type": { type: "string" },
    status: { type: "string" },
  },
});

if (!values.id || !/^\d{5,20}$/.test(values.id)) {
  console.error("缺少或非法的 --id（5-20 位数字的问题 ID）");
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("data/zhihu.db 不存在，先运行 node scripts/db/import.mjs");
  process.exit(1);
}

const today = new Date().toLocaleDateString("sv-SE");
const num = (v) => {
  if (v === undefined) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const db = new DatabaseSync(dbPath);
db.exec("BEGIN");
try {
  const existing = db.prepare("SELECT * FROM questions WHERE question_id = ?").get(values.id);
  if (existing) {
    db.prepare(
      `UPDATE questions SET
         title = COALESCE(?, title),
         title_raw = COALESCE(?, title_raw),
         last_seen = MAX(COALESCE(last_seen, ?), ?),
         source = COALESCE(?, source),
         kind = COALESCE(?, kind),
         q_type = COALESCE(?, q_type),
         follow_count = COALESCE(?, follow_count),
         view_count = COALESCE(?, view_count),
         answer_count = COALESCE(?, answer_count),
         t_score = COALESCE(?, t_score),
         status = COALESCE(?, status)
       WHERE question_id = ?`
    ).run(
      values.title ?? null,
      values.title ?? null,
      values.date ?? today,
      values.date ?? today,
      values.source ?? null,
      values.kind ?? null,
      values["q-type"] ?? null,
      num(values.follow),
      num(values.view),
      num(values.answers),
      num(values.t),
      values.status ?? null,
      values.id
    );
  } else {
    db.prepare(
      `INSERT INTO questions (
         question_id, title, title_raw, first_seen, last_seen, source, kind, q_type,
         follow_count, view_count, answer_count, t_score, status, parse_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')`
    ).run(
      values.id,
      values.title ?? null,
      values.title ?? null,
      values.date ?? today,
      values.date ?? today,
      values.source ?? null,
      values.kind ?? null,
      values["q-type"] ?? null,
      num(values.follow),
      num(values.view),
      num(values.answers),
      num(values.t),
      values.status ?? "candidate"
    );
  }
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}
db.close();

const render = spawnSync(process.execPath, [path.join(__dirname, "render.mjs"), "--write"], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (render.status !== 0) {
  console.error(render.stderr || render.stdout);
  process.exit(render.status ?? 1);
}
console.log(`已登记选题：${values.id} ${values.title ?? ""}`);
console.log(render.stdout.trim());
