#!/usr/bin/env node
/**
 * 新增/更新一条草稿登记：写 data/zhihu.db，随后重新渲染 md。
 *
 * 用法：
 *   node scripts/db/add-draft.mjs \
 *     --path "话题/问题/知乎回答-主题-v1.md" \
 *     --question-url "https://www.zhihu.com/question/123456789" \
 *     [--date 2026-11-05] [--summary "一句话描述"] [--status "初稿待发布"]
 *
 * 写完后 outlines/问题对应表.md 与 outlines/选题看板.md 自动更新。
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
    path: { type: "string" },
    "question-url": { type: "string" },
    date: { type: "string" },
    summary: { type: "string" },
    status: { type: "string" },
  },
});

if (!values.path) {
  console.error("缺少 --path（草稿相对路径）");
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("data/zhihu.db 不存在，先运行 node scripts/db/import.mjs");
  process.exit(1);
}

const today = new Date().toLocaleDateString("sv-SE");
const questionId = values["question-url"]
  ? (values["question-url"].match(/question\/(\d+)/)?.[1] ?? null)
  : null;
const platform = values.path.startsWith("百家号版-")
  ? "baijiahao"
  : values.path.startsWith("公众号版-")
    ? "wechat"
    : "zhihu";
const version = Number(values.path.match(/-v(\d+)\.md$/)?.[1] ?? 1);

const db = new DatabaseSync(dbPath);
db.exec("BEGIN");
try {
  if (questionId) {
    const exists = db.prepare("SELECT 1 FROM questions WHERE question_id = ?").get(questionId);
    if (!exists) {
      db.prepare(
        `INSERT INTO questions (question_id, first_seen, status, parse_status)
         VALUES (?, ?, 'drafted', 'partial')`
      ).run(questionId, values.date ?? today);
    } else {
      db.prepare("UPDATE questions SET status = 'drafted' WHERE question_id = ?").run(questionId);
    }
  }

  db.prepare(
    `INSERT INTO drafts (path, question_id, question_url, date, platform, version, summary, status, status_raw, source_file)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, 'scripts/db/add-draft.mjs')
     ON CONFLICT(path) DO UPDATE SET
       question_id = COALESCE(excluded.question_id, drafts.question_id),
       question_url = COALESCE(excluded.question_url, drafts.question_url),
       date = COALESCE(excluded.date, drafts.date),
       platform = excluded.platform,
       version = excluded.version,
       summary = COALESCE(excluded.summary, drafts.summary),
       status_raw = COALESCE(excluded.status_raw, drafts.status_raw),
       source_file = excluded.source_file`
  ).run(
    values.path,
    questionId,
    values["question-url"] ?? null,
    values.date ?? today,
    platform,
    version,
    values.summary ?? null,
    values.status ?? null
  );
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
console.log(`已登记草稿：${values.path}`);
console.log(render.stdout.trim());
