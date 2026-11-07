#!/usr/bin/env node
/**
 * 从 data/zhihu.db 渲染 markdown。
 *
 * 已切换为生成物的文件：
 *   - outlines/问题对应表.md
 *   - outlines/选题看板.md（新增）
 * 尚未切换：
 *   - outlines/选题历史.md（流水账含大量叙事段落，保留原文作为归档）
 *
 * 用法：
 *   node scripts/db/render.mjs            # 输出预览到 data/render-preview/
 *   node scripts/db/render.mjs --write    # 写入正式文件
 *   node scripts/db/render.mjs --check    # 校验磁盘文件与 db 渲染结果一致
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(repoRoot, "data/zhihu.db");
const previewDir = path.join(repoRoot, "data/render-preview");

const GEO_ORDER = ["核心词", "延伸词", "场景词", "对比词", "价格词", "风险词"];

/** 表格单元格转义：竖线会破坏列结构，换行会破坏行结构 */
const escapeCell = (value) => String(value ?? "").replace(/\|/g, "｜").replace(/\r?\n/g, " ");

const targetFiles = {
  questionMap: "outlines/问题对应表.md",
  dashboard: "outlines/选题看板.md",
};

/** GEO 关键词矩阵回写成原文格式 */
function geoText(geoJson) {
  if (!geoJson) return null;
  const geo = JSON.parse(geoJson);
  const parts = GEO_ORDER.filter((k) => Array.isArray(geo[k]) && geo[k].length).map(
    (k) => `${k} ${geo[k].join(" / ")}`
  );
  if (!parts.length) return null;
  return `关键词矩阵（GEO）：${parts.join("；")}。`;
}

/**
 * 渲染 outlines/问题对应表.md —— 全部草稿的汇总总表。
 * 各话题目录下的同名文件仍是人工登记源，这里按话题分组汇总，便于一处查看全部草稿。
 */
function renderQuestionMap(db) {
  const rows = db.prepare("SELECT * FROM drafts ORDER BY date DESC, path").all();
  const groups = new Map();
  for (const r of rows) {
    const topic = r.path.includes("/") ? r.path.split("/")[0] : "未归入话题";
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(r);
  }

  const sections = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([topic, list]) =>
      [
        `## ${topic}（${list.length}）`,
        "",
        "| 日期 | 草稿文件 | 问题链接 | 描述摘要 | 状态 |",
        "|------|----------|----------|----------|------|",
        ...list.map(
          (d) =>
            `| ${[d.date, d.path, d.question_url, d.summary, d.status_raw].map(escapeCell).join(" | ")} |`
        ),
        "",
      ].join("\n")
    );

  const geoRows = rows.filter((r) => r.geo_json);
  const geoSection = geoRows.length
    ? [
        "## 关键词矩阵（GEO）",
        "",
        ...geoRows.flatMap((d) => [`### ${d.path}`, "", geoText(d.geo_json), ""]),
      ].join("\n")
    : "";

  return [
    "# 草稿总表（由 data/zhihu.db 渲染，勿手改）",
    "",
    "> 各话题目录下的 `问题对应表.md` 仍是人工登记源；本表是全部草稿的汇总视图。",
    "> 更新：`node scripts/db/import.mjs` 重新导入后执行 `node scripts/db/render.mjs --write`。",
    "",
    ...sections,
    geoSection,
  ].join("\n");
}

/** 渲染 选题看板.md */
function renderDashboard(db) {
  const q = (sql, params = []) => db.prepare(sql).all(...params);

  const statusCounts = q("SELECT status, COUNT(*) n FROM questions GROUP BY status ORDER BY n DESC");
  const pendingDrafts = q(
    "SELECT path, date, status_raw FROM drafts WHERE status IN ('draft', 'ready') ORDER BY date DESC LIMIT 40"
  );
  const draftedQuestions = q(`SELECT question_id, title, last_seen, status_raw
    FROM questions WHERE status = 'drafted' ORDER BY last_seen DESC LIMIT 40`);
  const latest = q(`SELECT a.published_at, a.question_id, s.answer_url, s.reads, s.upvotes, s.favorites, s.rank
    FROM snapshots s JOIN answers a ON a.answer_url = s.answer_url
    WHERE s.snapshot_date = (SELECT MAX(snapshot_date) FROM snapshots WHERE answer_url = s.answer_url)
    ORDER BY s.reads DESC LIMIT 30`);
  const dropped = q(`SELECT question_id, title, status_raw FROM questions
    WHERE status = 'dropped' ORDER BY last_seen DESC LIMIT 20`);

  const mdTable = (headers, rows) =>
    rows.length
      ? [
          `| ${headers.join(" | ")} |`,
          `|${headers.map(() => "---").join("|")}|`,
          ...rows.map((r) => `| ${r.map(escapeCell).join(" | ")} |`),
        ].join("\n")
      : "_暂无数据_";

  return [
    "# 选题看板（由 data/zhihu.db 生成，勿手改）",
    "",
    `> 生成命令：\`node scripts/db/render.mjs --write\`｜数据源：\`node scripts/db/import.mjs\`｜快照日期：${q("SELECT MAX(snapshot_date) d FROM snapshots")[0]?.d ?? "无"}`,
    "",
    "## 选题池状态",
    "",
    mdTable(["状态", "数量"], statusCounts.map((r) => [r.status, r.n])),
    "",
    "## 已起草待发布",
    "",
    mdTable(
      ["草稿", "日期", "状态备注"],
      pendingDrafts.map((r) => [r.path, r.date ?? "", r.status_raw ?? ""])
    ),
    "",
    "## 已答待发布（问题维度）",
    "",
    mdTable(
      ["问题ID", "标题", "最近出现", "状态备注"],
      draftedQuestions.map((r) => [r.question_id, (r.title ?? "").slice(0, 40), r.last_seen ?? "", r.status_raw ?? ""])
    ),
    "",
    "## 各回答最新表现（按阅读降序）",
    "",
    mdTable(
      ["发布时间", "阅读", "赞同", "收藏", "排名", "回答"],
      latest.map((r) => [
        r.published_at ?? "",
        r.reads ?? "",
        r.upvotes ?? "",
        r.favorites ?? "",
        r.rank ?? "",
        r.answer_url,
      ])
    ),
    "",
    "## 已弃选",
    "",
    mdTable(
      ["问题ID", "标题", "弃选原因"],
      dropped.map((r) => [r.question_id, (r.title ?? "").slice(0, 40), r.status_raw ?? ""])
    ),
    "",
  ].join("\n");
}

function main() {
  const mode = process.argv.includes("--write")
    ? "write"
    : process.argv.includes("--check")
      ? "check"
      : "preview";
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const outputs = {
    questionMap: renderQuestionMap(db),
    dashboard: renderDashboard(db),
  };
  db.close();

  if (mode === "preview") {
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, "问题对应表.md"), outputs.questionMap, "utf8");
    fs.writeFileSync(path.join(previewDir, "选题看板.md"), outputs.dashboard, "utf8");
    console.log(`预览已写入 ${previewDir}`);
    return;
  }

  const results = [];
  for (const [key, rel] of Object.entries(targetFiles)) {
    const filePath = path.join(repoRoot, rel);
    const expected = outputs[key];
    if (mode === "check") {
      const actual = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      results.push({ file: rel, ok: actual === expected });
    } else {
      fs.writeFileSync(filePath, expected, "utf8");
    }
  }

  if (mode === "check") {
    const bad = results.filter((r) => !r.ok);
    if (bad.length) {
      console.error("以下文件与 db 渲染结果不一致，请重跑 render.mjs --write：");
      bad.forEach((r) => console.error(`  - ${r.file}`));
      process.exitCode = 1;
    } else {
      console.log("检查通过：md 与 db 渲染结果一致");
    }
  } else {
    console.log(`已写入：${Object.values(targetFiles).join("、")}`);
  }
}

main();
