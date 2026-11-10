#!/usr/bin/env node
// 选题报告：读取最近 N 天的 tracked-answers-*.jsonl，按作者分组渲染 Markdown 报告，
// 输出到 analytics/track/report-YYYY-MM-DD.md，并在控制台打印纯文本摘要。
// 用法：node scripts/track/report.mjs [--days 7]
import path from "node:path";
import fs from "node:fs";
import { trackRawDir, trackReportDir } from "./paths.mjs";

const daysArg = process.argv.indexOf("--days");
const DAYS = daysArg >= 0 ? Number(process.argv[daysArg + 1]) : 7;
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（本地时区）

// 计算窗口起点（本地时区，含当天）
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - (DAYS - 1));
const cutoffDate = cutoff.toLocaleDateString("sv-SE");

// ---- 读取窗口内的 jsonl ----
const rows = [];
for (const file of fs.readdirSync(trackRawDir)) {
  const m = file.match(/^tracked-answers-(\d{4}-\d{2}-\d{2})\.jsonl$/);
  if (!m || m[1] < cutoffDate || m[1] > today) continue;
  for (const line of fs.readFileSync(path.join(trackRawDir, file), "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // 跳过坏行
    }
  }
}

// 按作者分组，按点赞数降序
const byAuthor = new Map();
for (const r of rows) {
  if (!byAuthor.has(r.authorToken)) {
    byAuthor.set(r.authorToken, { name: r.authorName, answers: [] });
  }
  byAuthor.get(r.authorToken).answers.push(r);
}
const groups = [...byAuthor.entries()]
  .map(([token, g]) => ({
    token,
    name: g.name,
    answers: g.answers.sort((a, b) => (b.voteupCount ?? -1) - (a.voteupCount ?? -1)),
  }))
  .sort((a, b) => b.answers.length - a.answers.length);

// ---- 控制台纯文本摘要 ----
console.log(`近 ${DAYS} 天（${cutoffDate} ~ ${today}）追踪答主动态：共 ${rows.length} 条新回答`);
for (const g of groups) {
  console.log(`\n${g.name}（${g.token}）— ${g.answers.length} 条`);
  for (const a of g.answers.slice(0, 5)) {
    const vote = a.voteupCount != null ? `${a.voteupCount} 赞` : "赞数未知";
    console.log(`  · [${vote}] ${a.questionTitle}`);
  }
  if (g.answers.length > 5) console.log(`  …另有 ${g.answers.length - 5} 条，见报告`);
}

// ---- Markdown 报告 ----
const lines = [];
lines.push(`# 追踪答主选题报告（${cutoffDate} ~ ${today}）`);
lines.push("");
lines.push(`覆盖 ${groups.length} 位答主、${rows.length} 条新回答，按作者新回答数排序，组内按点赞数降序。`);
lines.push("");
for (const g of groups) {
  lines.push(`## ${g.name} — ${g.answers.length} 条新回答`);
  lines.push("");
  for (const a of g.answers) {
    const vote = a.voteupCount != null ? `${a.voteupCount} 赞` : "";
    // 一句话「为什么值得看」：按点赞量级给一句引导，具体判断留给作者
    let why = "";
    if (a.voteupCount != null) {
      why = a.voteupCount >= 1000
        ? "爆款级热度，值得拆它的切入角度"
        : a.voteupCount >= 100
          ? "已过百赞，选题方向有验证"
          : "新回答，可抢在爆发前占位";
    }
    lines.push(`- [${a.questionTitle}](${a.answerUrl})${vote ? ` — ${vote}` : ""}${why ? `（${why}）` : ""}`);
  }
  lines.push("");
}
const outFile = path.join(trackReportDir, `report-${today}.md`);
fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
console.log(`\n报告已生成：${outFile}`);
