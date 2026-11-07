// liker-scan 系列脚本共用的目录约定：
//   data/raw/liker-scan/  机器数据（raw/engage/seen-users），已 gitignore，不进版本库
//   analytics/liker-scan/ 人读的报告（report-YYYY-MM-DD.md），保留在版本库
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const likerRawDir = path.join(repoRoot, "data", "raw", "liker-scan");
export const likerReportDir = path.join(repoRoot, "analytics", "liker-scan");

fs.mkdirSync(likerRawDir, { recursive: true });
fs.mkdirSync(likerReportDir, { recursive: true });
