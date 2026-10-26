#!/usr/bin/env node
// 扫 R 级前 60 名，逐篇打开最新回答检查赞同按钮状态，产出「值得赞还未赞」手动清单。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = "analytics/liker-scan";
const seen = JSON.parse(fs.readFileSync(path.join(dir, "seen-users.json"), "utf-8"));

// 互动档案里已知已赞的 URL（脚本点的 + 打开时发现已赞的）
const known = new Set();
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith("engage-") && f.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  for (const r of d.results || []) {
    for (const v of r.voted || []) if (v.ok || v.note.includes("已赞过")) known.add(v.url);
  }
}

const rlevel = Object.entries(seen)
  .map(([t, s]) => ({ t, lc: s.likeCount ?? 0, ld: (s.likeDays ?? []).length }))
  .filter((u) => u.lc >= 2 || u.ld >= 2)
  .sort((a, b) => b.lc - a.lc || b.ld - a.ld)
  .slice(0, 60);

const browserScript = String.raw`
const ARGS = __ARGS__;
const task = await taskSpace("liker-scan-list-" + Date.now().toString(36));
const page = task.page("p1");
const fs = await import("node:fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto("https://www.zhihu.com");
await sleep(2000);

const out = [];
for (const u of ARGS.users) {
  let answers = [];
  try {
    const r = await page.fetch("https://www.zhihu.com/api/v4/members/" + u.t + "/answers?limit=3&offset=0", { timeout: 10000 });
    if (r.ok) {
      const j = JSON.parse(r.body);
      const data = Array.isArray(j) ? j : (j.data || []);
      answers = data.map((a) => ({ id: a.id, title: (a.question?.title || "").slice(0, 50) }));
    }
  } catch {}
  await sleep(1200);
  const unvoted = [];
  for (const a of answers.slice(0, 2)) {
    const url = "https://www.zhihu.com/answer/" + a.id;
    if (ARGS.known.includes(url)) continue;
    try {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      await sleep(2000);
      const st = await page.evaluate(() => {
        const b = document.querySelector("button.VoteButton");
        if (!b) return "none";
        const t = b.textContent.replace(/[\s\u200b\u200c\u200d]/g, "");
        if (/已赞同/.test(t) || b.className.toString().includes("is-active")) return "voted";
        if (!b.disabled && /^赞同/.test(t)) return "votable";
        return "none";
      });
      if (st === "votable") unvoted.push({ url, title: a.title });
    } catch {}
    await sleep(1200);
  }
  if (unvoted.length) out.push({ token: u.t, likeCount: u.lc, likeDays: u.ld, unvoted });
}
fs.writeFileSync(ARGS.outFile, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ users: out.length, items: out.reduce((n, u) => n + u.unvoted.length, 0), outFile: ARGS.outFile }));
await task.finish({ keep: [] });
`;

const outFile = path.join(dir, "unvoted-list.json");
const wrapper =
  `const __ARGS__ = ${JSON.stringify({ users: rlevel, known: [...known], outFile: path.resolve(outFile) })};` +
  browserScript.replace("const ARGS = __ARGS__;", "const ARGS = __ARGS__;");

const output = execFileSync("ego-browser", ["nodejs", "-e", wrapper], { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024 });
console.log(output.trim());
