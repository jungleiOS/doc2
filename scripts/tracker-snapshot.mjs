#!/usr/bin/env node
// 每日自动回采：官方 CLI 抓最近 30 天已发布回答的五指标 → 存快照 → 回写 data/zhihu.db。
// 用法：node scripts/tracker-snapshot.mjs
// 产物：
// - analytics/answers-<今天>.json（同日重复运行覆盖）
// - 对每个发布满 24h 的回答调 add-review.mjs 回写 db（从未复盘的=首采；已复盘的=7d+ 刷新）
// 不做的事：问题页排名（禁忌不批量翻页，排名只在手动复盘轮抓 ≤3 题）；
//           选题历史.md 的复盘叙事行（由手动复盘轮追加，避免无人值守写乱长文档）。
// 匹配口径：快照 questionTitle 归一化后匹配 选题历史.md 普通行的标题列取问题 ID，
//           「选题历史里没有登记的问题」跳过并记录（如热榜快车道题）。
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const CLI = path.join(process.env.HOME, "Library/Application Support/zhihu-cli/current/zhihu-cli");
const today = new Date().toLocaleDateString("sv-SE");
const log = (...a) => console.log(`[tracker-snapshot ${today}]`, ...a);

// 1. 拉取最近 30 天回答列表
const list = JSON.parse(execFileSync(CLI, [
  "me", "contents", "--type", "answer", "--sort", "ts", "--order", "desc", "--offset", "0", "--limit", "50",
], { maxBuffer: 16 * 1024 * 1024 }).toString());
if (list.Code !== 0) throw new Error(`me contents 失败：${list.Message}`);
const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
const items = list.Data.Items.filter(i => i.CreatedAt >= cutoff);
log(`最近30天回答 ${items.length} 篇`);

// 2. 逐篇 content-stats（瞬时失败重试一次）
function stats(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = JSON.parse(execFileSync(CLI, ["me", "content-stats", "--content-url", url], { maxBuffer: 16 * 1024 * 1024 }).toString());
      if (r.Code === 0 && r.Data?.Items?.[0]?.Metrics) return r.Data.Items[0];
      log("content-stats 非零返回", url, r.Message);
    } catch (e) {
      if (attempt === 1) log("content-stats 失败", url, e.message.slice(0, 100));
    }
  }
  return null;
}
const snap = [];
for (const it of items) {
  const s = stats(it.Url);
  if (!s) continue;
  const m = s.Metrics;
  snap.push({
    questionTitle: it.Title,
    answerUrl: it.Url,
    publishedAt: new Date(it.CreatedAt * 1000).toLocaleDateString("sv-SE"),
    reads: m.ViewCount ?? null,
    upvotes: m.UpvoteCount ?? null,
    comments: m.CommentCount ?? null,
    favorites: m.CollectCount ?? null,
    likes: m.LikeCount ?? null,
  });
}
const snapDir = path.join(repoRoot, "data", "raw");
fs.mkdirSync(snapDir, { recursive: true });
const snapFile = path.join(snapDir, `answers-${today}.json`);
fs.writeFileSync(snapFile, JSON.stringify(snap, null, 2));
log(`快照已写 ${snapFile}（${snap.length}/${items.length} 篇）`);

// 3. 选题历史.md：标题 → 问题 ID；已有复盘 ID 集合
const hist = fs.readFileSync(path.join(repoRoot, "outlines/选题历史.md"), "utf-8");
const norm = s => s.replace(/[\s？?，,。.「」『』":：、·—\-]/g, "");
const lines = hist.split("\n");
const reviewedQids = new Set();
for (const l of lines) {
  if (!l.includes("复盘")) continue;
  for (const m of l.matchAll(/\b\d{5,20}\b/g)) reviewedQids.add(m[0]);
}
const titleToQid = new Map(); // key: 归一化标题15字前缀 → { qid, text }
for (const l of lines) {
  if (!l.startsWith("|")) continue;
  const cols = l.split("|").map(c => c.trim());
  const id = cols.find(c => /^\d{5,20}$/.test(c));
  if (!id) continue;
  const text = cols.find(c => c && !/^\d{5,20}$/.test(c) && !/^\d{4}-\d{2}-\d{2}$/.test(c) && !/^(流量|普通|带货|复盘|用户指定|热榜)$/.test(c) && c.length > 8);
  if (text) titleToQid.set(norm(text).slice(0, 15), { qid: id, text });
}
const findQid = t => {
  const n = norm(t);
  for (const [k, v] of titleToQid) {
    if (!(n.includes(k) || k.includes(n.slice(0, 15)))) continue;
    // 防误配（如选题行备注里提到别的问题名）：登记行的标题必须以本题标题开头
    if (!norm(v.text).startsWith(n.slice(0, 12))) continue;
    return v.qid;
  }
  return null;
};

// 4. 回写 db：发布满 24h 的每篇都调 add-review（db 是结构化口径，重复调用即刷新）
let ok = 0, skipped = 0, failed = 0;
for (const a of snap) {
  const ageH = (Date.now() - new Date(a.publishedAt).getTime()) / 3600000;
  if (ageH < 24) { skipped++; continue; }
  const qid = findQid(a.questionTitle);
  if (!qid) { log("未匹配问题 ID，跳过", a.questionTitle.slice(0, 30)); skipped++; continue; }
  const kind = reviewedQids.has(qid) ? "刷新" : "首采";
  try {
    execFileSync("node", [path.join(repoRoot, "scripts/db/add-review.mjs"), "--id", qid, "--upvotes", String(a.upvotes), "--date", today], { stdio: "pipe" });
    ok++;
    log(`${kind} ✓`, qid, `赞${a.upvotes}`);
  } catch (e) {
    failed++;
    log("add-review 失败", qid, (e.stderr || "").toString().slice(0, 100));
  }
}
log(`完成：回写 ${ok} / 跳过 ${skipped} / 失败 ${failed}`);

// 5. 快照入库：add-review 只回写 questions，五指标快照要 import 才进 snapshots 表
try {
  execFileSync("node", [path.join(repoRoot, "scripts/db/import.mjs")], { stdio: "pipe" });
  log("快照已导入 data/zhihu.db");
} catch (e) {
  log("import 失败", (e.stderr || "").toString().slice(0, 200));
}
