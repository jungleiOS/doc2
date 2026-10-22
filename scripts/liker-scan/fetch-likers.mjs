#!/usr/bin/env node
// 抓取知乎「赞同/喜欢了我的内容」通知里的点赞用户，输出 JSON 到 analytics/liker-scan/。
// 用法：node scripts/liker-scan/fetch-likers.mjs [天数，默认2]
// 内部通过 ego-browser nodejs 执行浏览器脚本（复用已登录会话）。
// 顺带：对带「感谢」按钮的点赞通知点感谢；在 seen-users.json 累计互动亲密度（likeCount/likeDays）。
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const days = Number(process.argv[2] ?? 2);
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（本地时区）
const outDir = path.join(repoRoot, "analytics", "liker-scan");
const outFile = path.join(outDir, `raw-${today}.json`);
const seenFile = path.join(outDir, "seen-users.json");

fs.mkdirSync(outDir, { recursive: true });

// ---- 浏览器端脚本（在 ego-browser nodejs 环境内运行） ----
const browserScript = String.raw`
const existing = (await listTaskSpaces()).find((s) => s.name === "liker-scan" && s.ownership !== "user");
const task = existing ? await taskSpace(existing.spaceId ?? existing.id) : await taskSpace("liker-scan");
const page = task.page("p1");
const fs = await import("node:fs");

const DAYS = ARGS.days ?? 2;
const OUT_FILE = ARGS.outFile;
const SEEN_FILE = ARGS.seenFile;

// 已见集合：token -> { firstSeen, lastSeen, lastGrade }
let seen = {};
try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, "utf-8")); } catch {}

// 本轮已感谢过的人（token），避免重复点
const thankedTokens = new Set();
let thankClicks = 0, thankFailures = 0;

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - DAYS);
const cutoffTime = new Date(cutoff.toDateString()).getTime();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseDateText(text) {
  // 支持 "2026-10-19"、"昨天"、"10月18日"
  const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  if (text.includes("昨天")) { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(d.toDateString()).getTime(); }
  const m2 = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (m2) { const now = new Date(); return new Date(now.getFullYear(), Number(m2[1]) - 1, Number(m2[2])).getTime(); }
  return null;
}

// 收集当前 DOM 里所有通知条目（按 DateSplit 归属日期）
function collectItems() {
  return page.evaluate(() => {
    const results = [];
    const container = document.querySelector(".NotificationList");
    if (!container) return results;
    let curDate = null;
    const nodes = container.querySelectorAll(".NotificationList-DateSplit, .NotificationList-Item");
    for (const child of nodes) {
      if (child.className.toString().includes("NotificationList-DateSplit")) {
        curDate = child.textContent.trim();
        continue;
      }
      const verb = child.querySelector(".NotificationList-Item-verb")?.textContent.trim() || "";
      const m = verb.match(/(赞同|喜欢)了你的/);
      if (!m) continue; // 只要点赞/喜欢类
      const people = [...child.querySelectorAll('a[href*="/people/"]')].map((a) => ({
        name: a.textContent.trim(),
        token: (a.getAttribute("href").match(/\/people\/([^/?#]+)/) || [])[1] || "",
      })).filter((p) => p.token);
      const aggEl = [...child.querySelectorAll("button, span, a")].find((e) => e.children.length === 0 && /^等\d+人$/.test(e.textContent.trim()));
      const timeText = child.textContent.match(/·\s*(\d{2}:\d{2})/)?.[1] || "";
      results.push({ dateText: curDate, verb, people, timeText, hasAggregate: !!aggEl });
    }
    return results;
  });
}

await page.goto("https://www.zhihu.com/notifications");
await page.waitForLoadState("domcontentloaded");
await sleep(3000);

// 滚动加载：直到日期早于窗口或连续几次没有新条目
let prevCount = 0;
let stableRounds = 0;
let allItems = [];
for (let round = 0; round < 60; round++) {
  const items = await collectItems();
  allItems = items;
  // 展开聚合条目（“等N人”）
  for (let i = 0; i < items.length; i++) {
    if (!items[i].hasAggregate) continue;
    const clicked = await page.evaluate(() => {
      const items = document.querySelectorAll(".NotificationList-Item");
      for (const it of items) {
        const btn = [...it.querySelectorAll("button")].find((b) => /^\s*等\d+人\s*$/.test(b.textContent));
        if (btn) { btn.click(); return true; }
      }
      return false;
    });
    if (clicked) { await sleep(1500); break; }
  }
  // 感谢：对可见的、带「感谢」按钮且未感谢过的点赞通知条目点击感谢（失败不中断抓取）
  try {
    const clickedInfo = await page.evaluate((already) => {
      const out = [];
      const items = document.querySelectorAll('.NotificationList-Item');
      for (const it of items) {
        const verb = it.querySelector('.NotificationList-Item-verb')?.textContent.trim() || '';
        if (!/^(赞同|喜欢)了你的(回答|文章)/.test(verb)) continue;
        if (/已感谢/.test(it.textContent)) continue;
        const btn = [...it.querySelectorAll('button')].find((b) => /^\s*感谢\s*$/.test(b.textContent) && !b.disabled);
        if (!btn) continue;
        const tokens = [...it.querySelectorAll('a[href*="/people/"]')]
          .map((a) => (a.getAttribute('href').match(/\/people\/([^/?#]+)/) || [])[1])
          .filter(Boolean);
        if (tokens.length && tokens.every((t) => already.includes(t))) continue;
        btn.click();
        out.push({ tokens });
      }
      return out;
    }, [...thankedTokens]);
    if (clickedInfo.length) {
      await sleep(1500);
      // 处理点击后可能出现的弹层（关闭/取消/确定）
      await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const btn = [...dialog.querySelectorAll('button')].find((b) => /关闭|取消|确定|好的/.test(b.textContent));
          if (btn) btn.click();
        }
      });
      // 校验状态：条目内应出现「已感谢」；没出现的记为失败
      const verified = await page.evaluate((clicks) => clicks.map((c) => {
        const items = [...document.querySelectorAll('.NotificationList-Item')];
        return items.some((it) => /已感谢/.test(it.textContent) && c.tokens.some((t) => it.innerHTML.includes('/people/' + t)));
      }), clickedInfo);
      verified.forEach((ok, i) => {
        if (ok) { thankClicks++; clickedInfo[i].tokens.forEach((t) => thankedTokens.add(t)); }
        else thankFailures++;
      });
      await sleep(1000);
    }
  } catch { thankFailures++; }
  const lastDate = items.length ? parseDateText(items[items.length - 1].dateText || "") : null;
  const doneByDate = lastDate !== null && lastDate < cutoffTime;
  await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.8)));
  await sleep(1800);
  const newCount = (await collectItems()).length;
  if (newCount === prevCount) stableRounds++; else stableRounds = 0;
  prevCount = newCount;
  if (doneByDate || stableRounds >= 3) break;
}

// 归并去重 + 日期过滤
const userMap = new Map();
for (const item of allItems) {
  const t = parseDateText(item.dateText || "");
  if (t === null || t < cutoffTime) continue;
  const dateStr = new Date(t).toLocaleDateString("sv-SE");
  for (const p of item.people) {
    if (!userMap.has(p.token)) {
      // firstSeenDate 保留首次入集日期（seen-users.json 里的记录），新用户才是今天
      const prev = seen[p.token];
      userMap.set(p.token, { token: p.token, name: p.name, url: "https://www.zhihu.com/people/" + p.token, firstSeenDate: prev ? prev.firstSeen : dateStr, liked: [], likeDays: [] });
    }
    const u = userMap.get(p.token);
    u.likeDays.push(dateStr);
    u.liked.push(item.verb + " " + (item.timeText || ""));
  }
}

// 补充资料：未抓过的用户走 API；已见过的跳过（避免高频请求）
const users = [...userMap.values()];
for (const u of users) u.likeDays = [...new Set(u.likeDays)];
const INCLUDE = "follower_count,voteup_count,answer_count,articles_count,headline,avatar_url";
let fetched = 0, skipped = 0, failed = 0;
for (const u of users) {
  if (seen[u.token]) {
    const s = seen[u.token];
    u.followers = null; u.voteups = null; u.answers = null; u.headline = null;
    u.seenBefore = true; u.lastGrade = s.lastGrade ?? null;
    skipped++;
    continue;
  }
  try {
    const r = await page.fetch("https://www.zhihu.com/api/v4/members/" + u.token + "?include=" + INCLUDE, { timeout: 10000 });
    if (r.ok) {
      const j = JSON.parse(r.body);
      u.followers = j.follower_count ?? null;
      u.voteups = j.voteup_count ?? null;
      u.answers = j.answer_count ?? null;
      u.headline = j.headline || "";
      u.hasAvatar = !j.use_default_avatar;
      u.ip = j.ip_info || "";
    } else {
      u.followers = null; u.voteups = null; u.answers = null; u.headline = null;
      failed++;
    }
  } catch {
    u.followers = null; u.voteups = null; u.answers = null; u.headline = null;
    failed++;
  }
  fetched++;
  await sleep(700 + Math.random() * 500);
}

// 更新已见集合（含互动亲密度累计：likeCount/likeDays）
for (const u of users) {
  const days = u.likeDays || [];
  const s = seen[u.token];
  if (s) {
    s.lastSeen = u.firstSeenDate;
    s.likeCount = (s.likeCount ?? 0) + u.liked.length;
    s.likeDays = [...new Set([...(s.likeDays ?? []), ...days])].sort();
    if (s.lastEngaged === undefined) s.lastEngaged = null;
  } else {
    seen[u.token] = { firstSeen: u.firstSeenDate, lastSeen: u.firstSeenDate, lastGrade: null, likeCount: u.liked.length, likeDays: days, lastEngaged: null };
  }
}
fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));

const out = { date: ARGS.today, windowDays: DAYS, total: users.length, fetched, skippedSeen: skipped, fetchFailed: failed, thanked: thankClicks, thankFailed: thankFailures, thankedTokens: [...thankedTokens], users };
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ total: users.length, fetched, skippedSeen: skipped, fetchFailed: failed, thanked: thankClicks, thankFailed: thankFailures, outFile: OUT_FILE }));

await task.finish({ keep: [] });
`;

const env = {
  ...process.env,
  LIKER_SCAN_ARGS: JSON.stringify({ days, outFile, seenFile, today }),
};

const wrapper = `
const ARGS = ${JSON.stringify({ days, outFile, seenFile, today })};
` + browserScript;
try {
  const output = execFileSync("ego-browser", ["nodejs", "-e", wrapper], {
    env,
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 16 * 1024 * 1024,
  });
  console.log(output.trim());
} catch (err) {
  console.error("抓取失败：", err.message);
  process.exit(1);
}
