#!/usr/bin/env node
// 抓取追踪答主的最近回答，与快照 diff 后把增量写入 data/raw/tracked-answers-YYYY-MM-DD.jsonl。
// 用法：node scripts/track/collect.mjs [--limit 5]
// 内部通过 ego-browser nodejs 执行浏览器脚本（复用已登录会话），模式同 scripts/liker-scan/fetch-likers.mjs。
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { trackAuthorsFile, trackSnapshotDir, trackRawDir } from "./paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 5;
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（本地时区）
const outFile = path.join(trackRawDir, `tracked-answers-${today}.jsonl`);

// ---- 读名单 ----
const authors = [];
if (!fs.existsSync(trackAuthorsFile)) {
  console.error(`名单不存在：${trackAuthorsFile}，先用扩展按钮或手工添加答主。`);
  process.exit(1);
}
for (const line of fs.readFileSync(trackAuthorsFile, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  try {
    const obj = JSON.parse(trimmed);
    if (obj.urlToken) authors.push(obj);
  } catch {
    // 跳过坏行
  }
}
if (!authors.length) {
  console.error("追踪名单为空。");
  process.exit(1);
}
console.log(`共 ${authors.length} 位追踪答主，每人最多抓 ${LIMIT} 条`);

// ---- 浏览器端脚本（在 ego-browser nodejs 环境内运行） ----
const browserScript = String.raw`
const fs = await import("node:fs");
const task = await taskSpace("track-collect");
const page = task.page("p1");

const AUTHORS = ARGS.authors;
const LIMIT = ARGS.limit;
const OUT_FILE = ARGS.outFile;
const SNAPSHOT_DIR = ARGS.snapshotDir;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 抓取当前页面上可见的回答条目（容错选择器：新版个人页 / 旧版列表）
function collectAnswers() {
  return page.evaluate(() => {
    const out = [];
    const items = document.querySelectorAll('.Profile-main .List-item, .Profile-answers .List-item, .List-item');
    items.forEach((item) => {
      const qLink = item.querySelector('a[href*="/question/"]');
      if (!qLink) return;
      const qHref = qLink.getAttribute('href') || '';
      const qMatch = qHref.match(/\/question\/(\d+)/);
      if (!qMatch) return;
      const aLink = item.querySelector('a[href*="/answer/"]');
      // href 可能是绝对协议相对（//www.zhihu.com/...）或站内路径（/question/...）
      const abs = (href) => {
        if (!href) return null;
        if (href.startsWith('//')) return 'https:' + href;
        if (href.startsWith('/')) return 'https://www.zhihu.com' + href;
        return href;
      };
      const aHref = aLink ? abs(aLink.getAttribute('href')) : null;
      const voteEl = item.querySelector('.VoteButton--up, [class*="VoteButton--up"]');
      const timeEl = item.querySelector('time, [data-tooltip], .ContentItem-time');
      const title =
        item.querySelector('.ContentItem-title, .QuestionItem-title')?.textContent.trim() ||
        qLink.textContent.trim();
      // 卡片内嵌结构化数据：赞同数、发布时间
      let za = null;
      const contentItem = item.querySelector('.ContentItem');
      try { za = JSON.parse(contentItem ? contentItem.getAttribute('data-za-extra-module') : 'null'); } catch {}
      const cleanText = (s) => (s || '').replace(/[\u200b\u200c\u200d]/g, '').trim();
      const created =
        timeEl ? cleanText(timeEl.getAttribute('datetime') || timeEl.textContent) : null;
      out.push({
        questionId: qMatch[1],
        questionTitle: title,
        answerUrl: aHref || abs(qHref),
        voteupCount: (za && za.card && za.card.content && typeof za.card.content.upvote_num === 'number')
          ? za.card.content.upvote_num
          : (voteEl ? Number(cleanText(voteEl.textContent).replace(/[^\d]/g, '')) || 0 : null),
        createdTime: created || null,
      });
    });
    // 按 answerUrl 去重
    const seen = new Set();
    return out.filter((a) => (seen.has(a.answerUrl) ? false : (seen.add(a.answerUrl), true)));
  });
}

const summary = [];
const failed = [];
const allNewAnswers = [];

for (const author of AUTHORS) {
  const snapshotFile = SNAPSHOT_DIR + '/' + author.urlToken + '.json';
  let prev = { answers: [] };
  try { prev = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8')); } catch {}
  const prevUrls = new Set((prev.answers || []).map((a) => a.answerUrl));

  try {
    await page.goto('https://www.zhihu.com/people/' + author.urlToken + '/answers');
    await page.waitForLoadState('domcontentloaded');
    await sleep(3000);

    // 滚动加载，最多 15 屏，条目数够了或连续两轮无新增就停
    let answers = [];
    let stableRounds = 0;
    for (let round = 0; round < 15; round++) {
      answers = await collectAnswers();
      if (answers.length >= LIMIT) break;
      const before = answers.length;
      await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.9)));
      await sleep(1800);
      const after = (await collectAnswers()).length;
      if (after === before) { if (++stableRounds >= 2) break; } else { stableRounds = 0; }
    }

    answers = answers.slice(0, LIMIT);
    const fresh = answers.filter((a) => !prevUrls.has(a.answerUrl));
    fs.writeFileSync(snapshotFile, JSON.stringify({
      urlToken: author.urlToken,
      name: author.name,
      fetchedAt: new Date().toISOString(),
      answers,
    }, null, 2));

    for (const a of fresh) {
      allNewAnswers.push({ authorToken: author.urlToken, authorName: author.name, foundAt: ARGS.today, ...a });
    }
    summary.push({ token: author.urlToken, name: author.name, fetched: answers.length, fresh: fresh.length });

    // 防反爬：下一位答主之前随机 sleep 2-4 秒
    await sleep(2000 + Math.random() * 2000);
  } catch (err) {
    failed.push({ token: author.urlToken, name: author.name, error: String(err.message || err) });
    summary.push({ token: author.urlToken, name: author.name, fetched: 0, fresh: 0 });
  }
}

// 增量追加写入当日 jsonl（已存在则续写，不覆盖）
if (allNewAnswers.length) {
  fs.appendFileSync(OUT_FILE, allNewAnswers.map((a) => JSON.stringify(a)).join('\n') + '\n');
}

console.log(JSON.stringify({ outFile: OUT_FILE, summary, failed }, null, 2));
fs.writeFileSync(ARGS.resultFile, JSON.stringify({ outFile: OUT_FILE, summary, failed }, null, 2));
await task.finish({ keep: [] });
`;

const resultFile = path.join(trackRawDir, "collect-result.json");

const wrapper =
  "const ARGS = " +
  JSON.stringify({
    authors,
    limit: LIMIT,
    today,
    outFile,
    snapshotDir: trackSnapshotDir,
    resultFile,
  }) +
  ";" +
  browserScript;

try {
  // launchd 环境 PATH 不含 ~/.local/bin，用绝对路径
  execFileSync("/Users/jiangjun/.local/bin/ego-browser", ["nodejs", "-e", wrapper], {
    env: { ...process.env },
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["ignore", "inherit", "inherit"],
    maxBuffer: 16 * 1024 * 1024,
  });
  // 浏览器脚本把摘要写到 resultFile，避免解析 ego 混合日志
  const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
  for (const s of result.summary) {
    console.log(`${s.name}（${s.token}）：抓到 ${s.fetched} 条，新增 ${s.fresh} 条`);
  }
  if (result.failed.length) {
    console.log("\n以下答主抓取失败：");
    for (const f of result.failed) console.log(`- ${f.name}（${f.token}）：${f.error}`);
  }
  console.log(`\n增量已写入：${result.outFile}`);
  console.log("提示：跑 node scripts/track/report.mjs 生成选题报告（追踪数据为独立数据流，不走 scripts/db/sync.mjs）。");
} catch (err) {
  console.error("抓取失败：", err.message);
  process.exit(1);
}
