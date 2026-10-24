#!/usr/bin/env node
// 对当日 report「常点赞用户（R 级）」区块里的人模拟真人阅读后回赞（只点赞，不回关）。
// 名单按互动亲密度挑选（累计点赞/点赞天数），不再看对方是否大号。
// 用法：
//   node scripts/liker-scan/engage-likers.mjs [日期，默认今天] [--append] [--skip N] [--max N]
//   --skip/--max：追加轮次用，跳过名单前 N 个要回赞的人、本轮最多处理 N 人；--append 结果写入 engage-日期-extra.json
// 输出 analytics/liker-scan/engage-YYYY-MM-DD.json；成功的用户会回写 seen-users.json 的 lastEngaged。
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const date = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : new Date().toLocaleDateString("sv-SE");
const dir = path.join(repoRoot, "analytics", "liker-scan");
const reportFile = path.join(dir, `report-${date}.md`);
const seenFile = path.join(dir, "seen-users.json");
// 追加轮次输出到独立文件，避免覆盖当日常规轮结果
const suffix = process.argv.includes("--append") ? "-extra" : "";
const outFile = path.join(dir, `engage-${date}${suffix}.json`);

function argNum(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : null;
}

// ---- 可调参数 ----
const LIMITS = {
  maxUsers: argNum("--max") ?? 15,   // 单轮总用户上限
  skipUsers: argNum("--skip") ?? 0,  // 跳过名单前 N 个要回赞的人（用于追加轮次捞后面的人）
  minReadMs: 20000,      // 单篇最短停留
  maxReadMs: 40000,      // 单篇最长停留
  minGapMs: 60000,       // 用户之间最短间隔
  maxGapMs: 180000,      // 用户之间最长间隔
  minAnswersToCheck: 1,  // 至少几篇可赞内容才动手
};

// 解析 report 的「常点赞用户（R 级）」区块，取本轮动作是「回赞N篇」的用户
function parseReportR(file) {
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  const users = [];
  let inR = false;
  for (const line of lines) {
    if (/^## /.test(line)) { inR = line.includes("R 级"); continue; }
    if (!inR || !line.startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    if (cols.length < 8 || cols[1] === "昵称" || cols[1].includes("---")) continue;
    const m = cols[2].match(/\/people\/([^/)]+)/);
    if (!m) continue;
    const action = cols[7] || "";
    const am = action.match(/^回赞(\d+)篇$/);
    users.push({
      token: m[1],
      name: cols[1],
      tier: cols[5],
      votesTarget: am ? Number(am[1]) : 0,  // 0 = 本轮不动作（冷却中/新入列），由外层记录跳过原因
      skipReason: am ? null : action,
    });
  }
  return users;
}

const seen = JSON.parse(fs.readFileSync(seenFile, "utf-8"));
const allUsers = parseReportR(reportFile);
// 上限只作用于真正要回赞的人；新入列的不占名额但也记录进输出
const allActionable = allUsers.filter((u) => u.votesTarget > 0);
const actionable = allActionable.slice(LIMITS.skipUsers);
let truncated = false;
if (actionable.length > LIMITS.maxUsers) {
  actionable.length = LIMITS.maxUsers;
  truncated = true;
}
if (LIMITS.skipUsers > 0 && allActionable.length > LIMITS.skipUsers) truncated = true;
const users = actionable.concat(allUsers.filter((u) => u.votesTarget === 0));

// ---- 浏览器端脚本（在 ego-browser nodejs 环境内运行） ----
const browserScript = String.raw`
const ARGS = __ARGS__;
// 每次运行用独立 space：上次被中断的残留 space 可能已被 finish，复用会在中途崩掉
const task = await taskSpace("liker-scan-engage-" + ARGS.runId);
const page = task.page("p1");
const fs = await import("node:fs");

const USERS = ARGS.users;
const LIMITS = ARGS.limits;
const OUT_FILE = ARGS.outFile;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// page.fetch 受 CORS 限制，先落到知乎域内
await page.goto("https://www.zhihu.com");
await sleep(2000);

const results = [];

// 取用户最近回答（优先），不足再补文章
async function recentContents(token) {
  const pick = (list) => list.map((x) => ({
    id: x.id,
    type: x.type === "article" ? "article" : "answer",
    title: (x.question?.title || x.title || "").slice(0, 60),
  }));
  try {
    const r = await page.fetch("https://www.zhihu.com/api/v4/members/" + token + "/answers?limit=5&offset=0", { timeout: 10000 });
    if (r.ok) {
      const j = JSON.parse(r.body);
      const list = pick(Array.isArray(j) ? j : (j.data || []));
      if (list.length) return list;
    }
  } catch {}
  try {
    const r = await page.fetch("https://www.zhihu.com/api/v4/members/" + token + "/articles?limit=5&offset=0", { timeout: 10000 });
    if (r.ok) {
      const j = JSON.parse(r.body);
      return pick(Array.isArray(j) ? j : (j.data || [])).map((c) => ({ ...c, type: "article" }));
    }
  } catch {}
  return [];
}

// 在内容页模拟阅读：滚动 2-4 次，总停留 minRead~maxRead 毫秒
async function readLikeHuman() {
  const total = rand(LIMITS.minReadMs, LIMITS.maxReadMs);
  const steps = 2 + Math.floor(Math.random() * 3);
  const start = Date.now();
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * (0.6 + Math.random() * 0.6))));
    const remain = total - (Date.now() - start);
    if (remain <= 0) break;
    await sleep(Math.min(rand(3000, 8000), remain));
  }
  const remain = total - (Date.now() - start);
  if (remain > 0) await sleep(remain);
}

// 找目标内容的赞同按钮（DOM 里第一个 .VoteButton）并返回状态：none | voted | votable
// 注意：页面右侧推荐内容也有 .VoteButton，必须只取第一个
function voteButtonState() {
  return page.evaluate(() => {
    const b = document.querySelector("button.VoteButton");
    if (!b) return { state: "none" };
    // 按钮文案带零宽字符（\u200b），必须显式剥掉再做前缀匹配
    const t = b.textContent.replace(/[\s\u200b\u200c\u200d]/g, "");
    const cls = b.className.toString();
    if (/已赞同/.test(t) || cls.includes("is-active")) return { state: "voted", text: t.slice(0, 30) };
    if (!b.disabled && /^赞同/.test(t)) return { state: "votable", text: t.slice(0, 30) };
    return { state: "none", text: t.slice(0, 30) };
  });
}

for (let i = 0; i < USERS.length; i++) {
  const u = USERS[i];
  const rec = { token: u.token, name: u.name, tier: u.tier, votesTarget: u.votesTarget, voted: [], skipped: null };
  // 本轮不动作的用户（新入列观察）：直接记录跳过原因
  if (u.votesTarget === 0) {
    rec.skipped = u.skipReason || "本轮不动作";
    results.push(rec);
    continue;
  }
  // 用户之间随机间隔
  if (i > 0) await sleep(rand(LIMITS.minGapMs, LIMITS.maxGapMs));
  try {
    const contents = (await recentContents(u.token)).slice(0, u.votesTarget);
    if (contents.length < LIMITS.minAnswersToCheck) {
      rec.skipped = "没有可赞的回答/文章";
      results.push(rec);
      continue;
    }
    for (const c of contents) {
      const url = c.type === "article"
        ? "https://zhuanlan.zhihu.com/p/" + c.id
        : "https://www.zhihu.com/answer/" + c.id;
      try {
        await page.goto(url);
        await page.waitForLoadState("domcontentloaded");
        await sleep(2500);
        const st = await voteButtonState();
        if (st.state === "none") { rec.voted.push({ url, title: c.title, ok: false, note: "未找到赞同按钮，跳过" }); continue; }
        if (st.state === "voted") { rec.voted.push({ url, title: c.title, ok: false, note: "已赞过，跳过" }); continue; }
        await readLikeHuman();
        const st2 = await voteButtonState();
        if (st2.state !== "votable") { rec.voted.push({ url, title: c.title, ok: false, note: "阅读后按钮状态变化（" + (st2.text || st2.state) + "），跳过" }); continue; }
        await page.evaluate(() => {
          const b = document.querySelector("button.VoteButton");
          if (b && !b.disabled) b.click();
        });
        await sleep(2000);
        const after = await voteButtonState();
        rec.voted.push({ url, title: c.title, ok: after.state === "voted", note: after.state === "voted" ? "" : "点击后未确认生效" });
      } catch (e) {
        rec.voted.push({ url, title: c.title, ok: false, note: "打开/阅读失败：" + String(e).slice(0, 80) });
      }
    }
  } catch (e) {
    rec.skipped = "取内容列表失败：" + String(e).slice(0, 80);
  }
  results.push(rec);
  fs.writeFileSync(OUT_FILE, JSON.stringify({ date: ARGS.date, limits: LIMITS, truncated: ARGS.truncated, results }, null, 2));
  console.log("[" + (i + 1) + "/" + USERS.length + "] " + u.name + " -> " + (rec.skipped || rec.voted.map((v) => (v.ok ? "赞" : "跳")).join(",")));
}

fs.writeFileSync(OUT_FILE, JSON.stringify({ date: ARGS.date, limits: LIMITS, truncated: ARGS.truncated, results }, null, 2));
const okCount = results.reduce((n, r) => n + r.voted.filter((v) => v.ok).length, 0);
console.log(JSON.stringify({ total: results.length, voted: okCount, outFile: OUT_FILE }));

await task.finish({ keep: [] });
`;

const wrapper = `
const __ARGS__ = ${JSON.stringify({ users, limits: LIMITS, outFile, date, truncated, runId: Date.now().toString(36) })};
` + browserScript.replace("const ARGS = __ARGS__;", "const ARGS = __ARGS__;");

try {
  const output = execFileSync("ego-browser", ["nodejs", "-e", wrapper], {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 16 * 1024 * 1024,
  });
  console.log(output.trim());
  if (truncated) console.log("注意：R 级用户超过 " + LIMITS.maxUsers + " 人，已截断，本轮只处理前 " + LIMITS.maxUsers + " 人。");
  // 回赞成功的用户记录 lastEngaged（仅留档，无冷却期）
  const out = JSON.parse(fs.readFileSync(outFile, "utf-8"));
  let updated = 0;
  for (const r of out.results) {
    if (r.voted.some((v) => v.ok) && seen[r.token]) {
      seen[r.token].lastEngaged = date;
      updated++;
    }
  }
  fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2));
  console.log(JSON.stringify({ lastEngagedUpdated: updated }));
} catch (err) {
  console.error("互动执行失败：", err.message);
  process.exit(1);
}
