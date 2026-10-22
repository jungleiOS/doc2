#!/usr/bin/env node
// 一次性回填：从 analytics/liker-scan/ 下所有 raw-*.json / engage-*.json
// 累计 seen-users.json 的新字段：likeCount / likeDays / lastEngaged。
// 用法：node scripts/liker-scan/backfill-seen.mjs
// 说明：
// - likeCount = 各 raw 文件里 users[].liked 数组长度之和（真实点赞事件数）
// - likeDays = 各 raw 文件里用户 firstSeenDate 的并集。局限：raw 的 liked 事件只记了时刻
//   没记日期，窗口内多次点赞会被归入首次出现日，可能低估点赞天数；逐日跑 fetch 后新数据无此问题
// - lastEngaged = engage-*.json 里该用户有成功点赞（ok=true）的最新文件日期
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dir = path.join(repoRoot, "analytics", "liker-scan");
const seenFile = path.join(dir, "seen-users.json");

const seen = JSON.parse(fs.readFileSync(seenFile, "utf-8"));

// 老记录补默认字段（向后兼容）
for (const s of Object.values(seen)) {
  if (s.likeCount === undefined) s.likeCount = 0;
  if (s.likeDays === undefined) s.likeDays = [];
  if (s.lastEngaged === undefined) s.lastEngaged = null;
}

let rawLikeEvents = 0;
let rawFiles = 0;
for (const f of fs.readdirSync(dir).filter((f) => /^raw-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
  rawFiles++;
  const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  for (const u of raw.users) {
    const s = seen[u.token];
    if (!s) continue; // seen 里不该出现 raw 外的人；防御
    const n = Array.isArray(u.liked) ? u.liked.length : 0;
    s.likeCount += n;
    rawLikeEvents += n;
    if (u.firstSeenDate && !s.likeDays.includes(u.firstSeenDate)) s.likeDays.push(u.firstSeenDate);
  }
}

let engageFiles = 0;
for (const f of fs.readdirSync(dir).filter((f) => /^engage-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
  engageFiles++;
  const date = f.match(/engage-(\d{4}-\d{2}-\d{2})\.json/)[1];
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  for (const r of j.results || []) {
    if ((r.voted || []).some((v) => v.ok)) {
      const s = seen[r.token];
      if (s && (s.lastEngaged === null || s.lastEngaged < date)) s.lastEngaged = date;
    }
  }
}

for (const s of Object.values(seen)) s.likeDays.sort();

fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2));

// 统计输出
const dist = { "1": 0, "2-4": 0, "5-9": 0, "10+": 0 };
for (const s of Object.values(seen)) {
  const c = s.likeCount;
  if (c <= 1) dist["1"]++;
  else if (c <= 4) dist["2-4"]++;
  else if (c <= 9) dist["5-9"]++;
  else dist["10+"]++;
}
console.log(JSON.stringify({ rawFiles, rawLikeEvents, engageFiles, total: Object.keys(seen).length, likeCountDist: dist }));
