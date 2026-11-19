#!/usr/bin/env node
// 定时采集追踪答主动态：先探活 ego-browser 登录会话，活着才抓；
// 有增量才生成报告并弹 macOS 通知，无增量/探活失败只记日志。
// 由 launchd 调用（com.jiangjun.zhihu-track-collect，13:07 / 18:07），也可手动直接跑。
// 注意：必须由 node 直接执行（launchd 下 /bin/bash 被 TCC 拦，node 不受限，同 server.mjs）。
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const LOG = path.join(REPO, "data/raw/track-schedule.log");
const RESULT_FILE = path.join(REPO, "data/raw/collect-result.json");

process.chdir(REPO);

function log(msg) {
  const ts = new Date().toLocaleString("sv-SE", { hour12: false }).replace("T", " ");
  fs.appendFileSync(LOG, `[${ts}] ${msg}\n`);
}

// launchd 环境 PATH 不含 ~/.local/bin，用绝对路径
const EGO = "/Users/jiangjun/.local/bin/ego-browser";

// ---- 探活：ego-browser 桥接和知乎登录会话（看门狗 90 秒）----
const healthScript = `
const task = await taskSpace("track-health");
const page = task.page("p1");
try {
  await page.goto("https://www.zhihu.com", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
  const loggedIn = await page.evaluate(() => !document.querySelector(".AppHeader-profile"));
  console.log("HEALTH:" + (loggedIn ? "logged-in" : "not-logged-in"));
} catch (e) {
  console.log("HEALTH:fail " + (e.message || e));
}
await task.finish({ keep: [] });
`;

const health = await new Promise((resolve) => {
  const child = spawn(EGO, ["nodejs", "-e", healthScript], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    resolve({ status: "timeout", out });
  }, 90_000);
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  child.on("close", () => {
    clearTimeout(timer);
    const m = out.match(/HEALTH:([a-z-]+)/);
    resolve({ status: m ? m[1] : "unknown", out });
  });
});

if (health.status !== "logged-in") {
  log(`探活未通过（状态：${health.status}），跳过本次采集`);
  if (health.out.trim()) log(`探活输出：${health.out.trim().slice(0, 500)}`);
  process.exit(0);
}

// ---- 采集 ----
const collect = spawnSync(process.execPath, [path.join(__dirname, "collect.mjs"), "--limit", "5"], {
  stdio: ["ignore", "pipe", "pipe"],
  maxBuffer: 16 * 1024 * 1024,
});
fs.appendFileSync(LOG, collect.stdout.toString());
if (collect.stderr.length) fs.appendFileSync(LOG, collect.stderr.toString());
if (collect.status !== 0) {
  log("采集失败，详见上方日志");
  process.exit(1);
}

// ---- 有增量才报告 + 通知 ----
let newCount = 0;
try {
  const r = JSON.parse(fs.readFileSync(RESULT_FILE, "utf-8"));
  newCount = (r.summary || []).reduce((s, x) => s + (x.fresh || 0), 0);
} catch { /* 按 0 处理 */ }

if (newCount > 0) {
  const report = spawnSync(process.execPath, [path.join(__dirname, "report.mjs"), "--days", "7"], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.appendFileSync(LOG, report.stdout.toString());
  const reportFile = fs.readdirSync(path.join(REPO, "analytics/track"))
    .filter((f) => /^report-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort().pop();
  spawnSync("osascript", [
    "-e",
    `display notification "追踪答主新增 ${newCount} 条回答，报告：analytics/track/${reportFile}" with title "选题追踪" sound name "Glass"`,
  ], { stdio: "ignore" });
  log(`完成：新增 ${newCount} 条，已通知`);
} else {
  log("完成：无新增，不打扰");
}

// ---- 看板复扫：已选未答高分题每天一次复抓快照算增量（失败不阻断主流程）----
const refetch = spawnSync(EGO, ["nodejs"], {
  input: `globalThis.SCOUT_CFG={root:'${REPO}'};\n` + fs.readFileSync(path.join(REPO, "scripts/scout/watchlist-refetch.mjs"), "utf8"),
  stdio: ["pipe", "pipe", "pipe"],
  timeout: 600_000,
  maxBuffer: 16 * 1024 * 1024,
});
fs.appendFileSync(LOG, refetch.stdout.toString());
if (refetch.stderr.length) fs.appendFileSync(LOG, refetch.stderr.toString());
const m = (refetch.stdout.toString().match(/SUMMARY:(\d+) 起量(\d+)/) || []);
if (refetch.status === 0 && m) {
  log(`看板复扫完成：${m[1]} 题，起量 ${m[2]} 题`);
  if (Number(m[2]) > 0) {
    spawnSync("osascript", [
      "-e",
      `display notification "看板 ${m[2]} 道题正在起量，详见 data/raw/watchlist-refetch-*" with title "选题追踪" sound name "Glass"`,
    ], { stdio: "ignore" });
  }
} else {
  log(`看板复扫失败（状态 ${refetch.status}），下次定时再试`);
}
process.exit(0);
