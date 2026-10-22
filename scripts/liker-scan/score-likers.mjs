#!/usr/bin/env node
// 读取 analytics/liker-scan/raw-YYYY-MM-DD.json，按信号打分分级，输出 Markdown 报告。
// A/B/C/D 级 = 回关建议（只看本轮新抓用户）；R 级 = 回赞名单（按互动亲密度，见文件底部 R 级区块）。
// 用法：node scripts/liker-scan/score-likers.mjs [raw文件日期，默认今天]
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const date = process.argv[2] ?? new Date().toLocaleDateString("sv-SE");
const dir = path.join(repoRoot, "analytics", "liker-scan");
const rawFile = path.join(dir, `raw-${date}.json`);
const seenFile = path.join(dir, "seen-users.json");
const reportFile = path.join(dir, `report-${date}.md`);

// ---- 可调阈值 ----
const THRESHOLDS = {
  creatorMinAnswers: 5,      // 创作者：回答数 ≥ 此值
  creatorMinVoteups: 1000,   // 创作者：获赞 ≥ 此值
  bigVoteups: 10000,         // 大号：获赞 ≥ 此值
  bigFollowers: 5000,        // 大号：粉丝 ≥ 此值
  smallMaxFollowers: 50,     // 小号：粉丝 < 此值且零回答
  fieldKeywords: ["数码", "手机", "平板", "充电", "AI", "科技", "评测", "电脑", "笔记本", "耳机", "智能", "产品", "互联网", "程序员", "摄影"],
};

// ---- R 级（回赞名单，按互动亲密度）----
const R_LEVEL = {
  minLikeCount: 2,   // 累计点赞 ≥ 2 即入 R 级
  minLikeDays: 2,    // 或点赞天数 ≥ 2（跨天点赞）
  fanCount: 3,       // 铁粉：累计点赞 ≥ 3
  fanDays: 3,        // 或点赞天数 ≥ 3
  fanVotes: 2,       // 铁粉回赞篇数
  regularVotes: 1,   // 常客回赞篇数
};

const raw = JSON.parse(fs.readFileSync(rawFile, "utf-8"));
const seen = JSON.parse(fs.readFileSync(seenFile, "utf-8"));

// 判断是否为已推荐过的老用户（本次之前已打过 A/B 级）
function wasRecommended(token) {
  const s = seen[token];
  if (!s) return false;
  return (s.lastGrade === "A" || s.lastGrade === "B") && s.firstSeen < date;
}

function isCreator(u) {
  return (u.answers ?? 0) >= THRESHOLDS.creatorMinAnswers || (u.voteups ?? 0) >= THRESHOLDS.creatorMinVoteups;
}
function fieldMatch(u) {
  const text = `${u.name || ""} ${u.headline || ""}`;
  return THRESHOLDS.fieldKeywords.some((k) => {
    if (/^[a-zA-Z]+$/.test(k)) {
      // 纯英文关键词（如 AI）按单词边界匹配，避免 "attain" 误判
      return new RegExp(`(^|[^a-zA-Z])${k}([^a-zA-Z]|$)`, "i").test(text);
    }
    return text.includes(k);
  });
}

function grade(u) {
  const statsMissing = u.followers === null && u.voteups === null && u.answers === null;
  // 本轮跳过的老用户没有新数据：沿用 seen-users.json 里的上次分级，不能按空数据重打
  if (statsMissing && u.lastGrade) {
    return { g: u.lastGrade, reason: "沿用上次分级（本轮未重新抓取）" };
  }
  const unknown = statsMissing;
  const followers = u.followers ?? 0;
  const answers = u.answers ?? 0;
  const voteups = u.voteups ?? 0;
  const reasons = [];
  let g = "D";
  if (unknown) {
    g = "C";
    reasons.push("资料未抓到，先回赞观察");
  } else if (isCreator(u) && fieldMatch(u)) {
    g = "A";
    reasons.push("同领域创作者（" + (u.headline || u.name).slice(0, 30) + "）");
  } else if (voteups >= THRESHOLDS.bigVoteups || followers >= THRESHOLDS.bigFollowers) {
    g = "B";
    reasons.push(voteups >= THRESHOLDS.bigVoteups ? `获赞${voteups}的大号` : `粉丝${followers}的大号`);
  } else if (answers === 0 && followers < THRESHOLDS.smallMaxFollowers) {
    g = "D";
    reasons.push("零回答低粉小号");
  } else {
    g = "C";
    reasons.push(answers > 0 ? "普通活跃号" : "资料有限");
  }
  if (u.seenBefore && (g === "A" || g === "B")) {
    if (wasRecommended(u.token)) {
      g = "C";
      reasons.push("此前已推荐过回关，降级避免重复推荐");
    }
  }
  return { g, reason: reasons.join("；") };
}

const ACTION = { A: "回关 + 回赞", B: "可回关", C: "只回赞", D: "跳过" };
const graded = raw.users.map((u) => {
  const { g, reason } = grade(u);
  return { ...u, grade: g, reason, action: ACTION[g] };
});
// 报告是行动清单：只列本轮真正新抓数据的用户；老用户（seenBefore）已推荐过，不再重复列出
const reportUsers = graded.filter((u) => !u.seenBefore);
reportUsers.sort((a, b) => a.grade.localeCompare(b.grade));

const dist = { A: 0, B: 0, C: 0, D: 0 };
for (const u of reportUsers) dist[u.grade]++;

const fmt = (n) => (n === null || n === undefined ? "—" : String(n));
const row = (u) =>
  `| ${u.name} | [主页](${u.url}) | ${fmt(u.followers)} | ${fmt(u.voteups)} | ${fmt(u.answers)} | ${u.grade} | ${u.reason} | ${u.action} |`;

const lines = [
  `# 点赞用户分诊报告 ${date}`,
  "",
  `- 窗口：最近 ${raw.windowDays} 天；去重后共 ${raw.total} 人（新抓资料 ${raw.fetched} 人，已见过跳过 ${raw.skippedSeen} 人，抓取失败 ${raw.fetchFailed} 人）`,
  `- 分级分布：A ${dist.A} 人 / B ${dist.B} 人 / C ${dist.C} 人 / D ${dist.D} 人（本表为回关建议，只列本轮新用户）`,
  `- 回赞名单看文末「常点赞用户（R 级）」区块，按互动亲密度挑选，与上表相互独立`,
  `- 粉丝/获赞/回答数为「—」表示未抓到（风控或接口失败），不要当成 0`,
  "",
  "## 回关建议（A/B/C/D 级，本轮新用户）",
  "",
  "| 昵称 | 主页 | 粉丝 | 获赞 | 回答数 | 分级 | 理由 | 建议动作 |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...reportUsers.map(row),
  "",
];

// ---- R 级区块：所有累计点赞达门槛的人（含本轮窗口外的老熟人）----
// 昵称/主页从全部历史 raw 文件里查（seen-users.json 不存昵称）
const tokenInfo = new Map();
for (const f of fs.readdirSync(dir).filter((f) => /^raw-\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  for (const u of r.users) {
    if (!tokenInfo.has(u.token)) tokenInfo.set(u.token, { name: u.name, url: u.url });
  }
}

const rUsers = Object.entries(seen)
  .map(([token, s]) => {
    const likeCount = s.likeCount ?? 0;
    const likeDays = (s.likeDays ?? []).length;
    if (likeCount < R_LEVEL.minLikeCount && likeDays < R_LEVEL.minLikeDays) return null;
    const isFan = likeCount >= R_LEVEL.fanCount || likeDays >= R_LEVEL.fanDays;
    const info = tokenInfo.get(token) || { name: token, url: "https://www.zhihu.com/people/" + token };
    // 本轮动作：新入列（当天才入集）先观察；否则按档位回赞（无冷却期）
    let action;
    if (s.firstSeen >= date) {
      action = "新入列（观察一天）";
    } else {
      action = "回赞" + (isFan ? R_LEVEL.fanVotes : R_LEVEL.regularVotes) + "篇";
    }
    return {
      token, name: info.name, url: info.url, likeCount, likeDays,
      tier: isFan ? "铁粉" : "常客",
      lastEngaged: s.lastEngaged || "—",
      action,
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.likeCount - a.likeCount || b.likeDays - a.likeDays);

lines.push("## 常点赞用户（R 级，回赞名单）", "");
lines.push(`按互动亲密度挑选（累计点赞 ≥ ${R_LEVEL.minLikeCount} 或 点赞天数 ≥ ${R_LEVEL.minLikeDays}），共 ${rUsers.length} 人；` +
  `铁粉（累计 ≥ ${R_LEVEL.fanCount} 或 跨 ${R_LEVEL.fanDays} 天）回赞 ${R_LEVEL.fanVotes} 篇，常客回赞 ${R_LEVEL.regularVotes} 篇。`, "");
lines.push("| 昵称 | 主页 | 累计点赞次数 | 点赞天数 | 亲密度档 | 上次回赞 | 本轮动作 |");
lines.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const u of rUsers) {
  lines.push(`| ${u.name} | [主页](${u.url}) | ${u.likeCount} | ${u.likeDays} | ${u.tier} | ${u.lastEngaged} | ${u.action} |`);
}
lines.push("");
fs.writeFileSync(reportFile, lines.join("\n"));

// 回写已见集合的分级（只写本轮有真实数据的用户，避免空数据覆盖旧分级）
for (const u of graded) {
  const statsMissing = u.followers === null && u.voteups === null && u.answers === null;
  if (!statsMissing && seen[u.token]) seen[u.token].lastGrade = u.grade;
}
fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2));

console.log(JSON.stringify({ report: reportFile, total: graded.length, dist }));
