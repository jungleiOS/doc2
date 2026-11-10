// 选题追踪工具集共用的目录约定：
//   data/tracked-authors.jsonl        追踪名单（版本库文件，人工+脚本共同维护）
//   data/raw/track-snapshot/          每人最近的回答快照（已 gitignore，不进版本库）
//   data/raw/tracked-answers-*.jsonl  每日抓到的增量新回答（已 gitignore）
//   analytics/track/                  人读的选题报告（report-YYYY-MM-DD.md），保留在版本库
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const trackAuthorsFile = path.join(repoRoot, "data", "tracked-authors.jsonl");
export const trackSnapshotDir = path.join(repoRoot, "data", "raw", "track-snapshot");
export const trackRawDir = path.join(repoRoot, "data", "raw");
export const trackReportDir = path.join(repoRoot, "analytics", "track");

fs.mkdirSync(trackSnapshotDir, { recursive: true });
fs.mkdirSync(trackReportDir, { recursive: true });
