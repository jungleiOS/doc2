#!/usr/bin/env node
/**
 * 回写一条复盘数据：把某题的赞同数/排名写进 data/zhihu.db，并把状态标为 published。
 *
 * 用法：
 *   node scripts/db/add-review.mjs \
 *     --id 2094037238065714517 \
 *     --upvotes 25 \
 *     [--rank 3] [--total 5] [--date 2026-11-05]
 *
 * --rank 支持 >20 这类写法（表示不在前 20 条），此时排名按「>20」原样记录。
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
    upvotes: { type: "string" },
    rank: { type: "string" },
    total: { type: "string" },
    date: { type: "string" },
  },
});

if (!values.id || !/^\d{5,20}$/.test(values.id)) {
  console.error("缺少或非法的 --id（5-20 位数字的问题 ID）");
  process.exit(1);
}
if (values.upvotes === undefined || !/^\d+$/.test(values.upvotes)) {
  console.error("缺少 --upvotes（赞同数，整数）");
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("data/zhihu.db 不存在，先运行 node scripts/db/import.mjs");
  process.exit(1);
}

const today = new Date().toLocaleDateString("sv-SE");
const rankRaw = values.rank ?? null;
const note = `复盘：赞同 ${values.upvotes}${rankRaw ? `，排名 ${rankRaw}${values.total ? `/${values.total}` : ""}` : ""}`;

const db = new DatabaseSync(dbPath);
db.exec("BEGIN");
try {
  const existing = db.prepare("SELECT * FROM questions WHERE question_id = ?").get(values.id);
  if (!existing) {
    console.error(`问题 ${values.id} 不在库中；先用 add-question.mjs 登记，或确认 ID 是否正确`);
    db.exec("ROLLBACK");
    process.exit(1);
  }
  db.prepare(
    `UPDATE questions SET status = 'published', status_raw = ?, last_seen = MAX(COALESCE(last_seen, ?), ?)
     WHERE question_id = ?`
  ).run(note, values.date ?? today, values.date ?? today, values.id);
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
console.log(`已回写复盘：${values.id} ${note}`);
console.log(render.stdout.trim());
