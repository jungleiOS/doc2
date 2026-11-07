#!/usr/bin/env node
/**
 * 一条命令完成「导入 + 渲染」：
 *   node scripts/db/sync.mjs
 *
 * 用于手改了话题级 问题对应表.md 或新增了草稿之后，把变更同步进 db 并刷新：
 *   - outlines/问题对应表.md（草稿总表）
 *   - outlines/选题看板.md（状态/待发布/表现视图）
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const steps = [
  ["import.mjs"],
  ["render.mjs", "--write"],
  ["render.mjs", "--check"],
];

for (const [script, ...args] of steps) {
  const res = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (res.status !== 0) {
    console.error(`失败：${script} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}
