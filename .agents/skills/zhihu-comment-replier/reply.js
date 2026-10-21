// 知乎评论定点回复脚本（zhihu-comment-replier 配套）
// 用法（在仓库根目录通过 ego-browser 执行）：
//   先把参数写成 JSON 到 .reply-args.json：["<回答URL>", "<评论匹配关键词>", "<回复文本>"]
//   再执行：ego-browser nodejs .agents/skills/zhihu-comment-replier/reply.js
//   （ego nodejs 不支持给脚本传多个位置参数，故走参数文件；文件用后立即删除）
// 流程：打开回答 → 展开评论区 → 按关键词定位评论块（div[data-id]）→ 点「回复」→
//       在评论块内输入（insertText）→ 校验文本单份且只在目标块 → 点块内「发布」→ 接口验证。
// 安全绳：任何一步校验不过都会 abort，不会误发到顶层框。
// 依赖：同仓库 references/ 下无；须在已登录知乎的 ego-browser task space 中运行，
//       首次使用先创建/复用 space，把 space id 填到下方 SPACE_ID（或用环境变量 EGO_SPACE_ID）。

const SPACE_ID = process.env.EGO_SPACE_ID ? Number(process.env.EGO_SPACE_ID) : 32; // 默认复用 zhihu-comment-replier space（2026-10-19 会话 space id=32；实测 ego nodejs 不接收环境变量，改动请改这里）

const fs = await import("node:fs/promises");
const REPO = "/Users/jiangjun/Documents/kimi/Workspaces/zhihu";
const ARG_CANDIDATES = [".reply-args.json", `${REPO}/.reply-args.json`];
let args;
try {
  args = process.argv.slice(2);
  if (!args.length) {
    for (const p of ARG_CANDIDATES) {
      try { args = JSON.parse(await fs.readFile(p, "utf8")); break; } catch {}
    }
  }
} catch { args = []; }
const [answerUrl, matchKeyword, replyText] = args;
if (!answerUrl || !matchKeyword || !replyText) {
  console.error('用法: 参数写入 .reply-args.json：["<回答URL>", "<评论匹配关键词>", "<回复文本>"] 后运行 reply.js');
  process.exit(1);
}
for (const p of ARG_CANDIDATES) await fs.rm(p, { force: true });

const task = await taskSpace(SPACE_ID);
const page = task.page("p1");

const fail = (msg) => { console.error("ABORT:", msg); process.exit(1); };

// 1. 打开回答并展开评论区
// 注意：回答页有多张回答卡片，必须点「我自己这条回答」的评论按钮，
// 否则弹层是别人的评论区（2026-10-14 实测踩坑：点全页第一个「N 条评论」会开错评论区）
await page.goto(answerUrl);
await page.waitForLoadState();
const myAnswerId = answerUrl.match(/answer\/(\d+)/)?.[1] ?? null;
await page.evaluate((aid) => {
  const card = document.querySelector(`a[href*="/answer/${aid}"]`)?.closest("div");
  let scope = null, n = card;
  for (let i = 0; i < 25 && n; i++) {
    n = n.parentElement;
    if (n && [...n.querySelectorAll("button")].some(b => /条评论|查看全部.*评论/.test(b.textContent || ""))) { scope = n; break; }
  }
  scope = scope || document;
  const b = [...scope.querySelectorAll("button")].find(x => /条评论|查看全部.*评论/.test(x.textContent || ""));
  if (b) b.click();
}, myAnswerId);
await page.waitForTimeout(2500);

// 2. 预展开折叠的回复线程（二级评论默认折叠，不展开定位不到）
await page.evaluate(() => {
  for (const b of [...document.querySelectorAll("button")]) {
    const t = (b.textContent || "").replace(/\u200b/g, "").trim();
    if (/展开其他.*回复|查看回复/.test(t) && b.offsetHeight > 0) b.click();
  }
});
await page.waitForTimeout(1500);

// 3. 定位评论块：匹配关键词的块可能有多层（父块文本包含子块全文），取最内层
const locate = await page.evaluate((kw) => {
  const modal = document.querySelector(".Modal-content") || document.body;
  const hits = [...modal.querySelectorAll("[data-id]")].filter(b => {
    const t = b.textContent || "";
    return t.includes(kw) && /回复|喜欢/.test(t);
  });
  if (!hits.length) return null;
  // 最内层 = 没有其他命中块是它的后代
  const innermost = hits.find(b => !hits.some(o => o !== b && b.contains(o)));
  const target = innermost || hits[0];
  // 找数据层 root（二级回复发送后平铺到 root 下，验证时要用）
  let root = target;
  for (let p = target.parentElement; p; p = p.parentElement) {
    if (p === modal) break;
    if (p.hasAttribute && p.hasAttribute("data-id")) root = p;
  }
  return { id: target.getAttribute("data-id"), rootId: root.getAttribute("data-id") };
}, matchKeyword);
if (!locate) fail(`找不到含「${matchKeyword}」的评论块`);
const commentId = locate.id;
const rootId = locate.rootId;
console.log("评论块 id:", commentId, "线程 root id:", rootId);

// 3. 点击该评论的「回复」按钮
await page.evaluate((id) => {
  const block = document.querySelector(`.Modal-content [data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
  const btn = [...block.querySelectorAll("button")].find(b => (b.textContent || "").replace(/\u200b/g, "").trim() === "回复" && b.offsetHeight > 0);
  if (btn) btn.click();
}, commentId);
await page.waitForTimeout(1500);

// 4. 在评论块内聚焦输入框并写入
await page.evaluate((id) => {
  const block = document.querySelector(`.Modal-content [data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
  const ed = [...block.querySelectorAll("[contenteditable=true]")].find(e => e.offsetHeight > 0);
  if (!ed) throw new Error("目标评论块内没有输入框");
  ed.scrollIntoView({ block: "center" });
}, commentId);
await page.waitForTimeout(800);
const box = await page.evaluate((id) => {
  const block = document.querySelector(`.Modal-content [data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
  const ed = [...block.querySelectorAll("[contenteditable=true]")].find(e => e.offsetHeight > 0);
  const r = ed.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, commentId);
await page.mouse.click(box.x, box.y, { label: "focus reply editor" });
await page.waitForTimeout(500);
await page.keyboard.insertText(replyText);
await page.waitForTimeout(600);

// 5. 校验：文本在目标块内、单份完整；其他可见输入框为空
const check = await page.evaluate(({ id, text }) => {
  const block = document.querySelector(`.Modal-content [data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
  const ed = [...block.querySelectorAll("[contenteditable=true]")].find(e => e.offsetHeight > 0);
  const inBlock = ed ? ed.textContent : null;
  const others = [...document.querySelectorAll("[contenteditable=true]")]
    .filter(e => e.offsetHeight > 0 && !block.contains(e))
    .map(e => e.textContent.trim())
    .filter(Boolean);
  const pub = [...block.querySelectorAll("button")].find(b => (b.textContent || "").replace(/\u200b/g, "").trim() === "发布" && b.offsetHeight > 0);
  return { inBlock, exact: inBlock === text, othersNonEmpty: others, hasPublish: !!pub, pubDisabled: pub ? pub.disabled : null };
}, { id: commentId, text: replyText });
if (!check.exact) fail(`目标框文本校验失败: ${JSON.stringify(check.inBlock)}`);
if (check.othersNonEmpty.length) fail("其他输入框非空，存在误发风险: " + JSON.stringify(check.othersNonEmpty));
if (!check.hasPublish) fail("目标评论块内没有「发布」按钮");
console.log("输入校验通过");

// 6. 点击块内「发布」
await page.evaluate((id) => {
  const block = document.querySelector(`.Modal-content [data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
  const pub = [...block.querySelectorAll("button")].find(b => (b.textContent || "").replace(/\u200b/g, "").trim() === "发布" && b.offsetHeight > 0);
  pub.click();
}, commentId);
await page.waitForTimeout(3000);

// 7. 接口权威验证：回复在对方评论的子评论里。
// 二级回复在知乎数据层平铺到 root 下，目标评论的 child_comments 恒为空——两级都查。
const strip = (s) => (s || "").replace(/<[^>]+>/g, "");
let hit = [];
for (const id of [...new Set([commentId, rootId])]) {
  const child = await page.fetch(`/api/v4/comments/${id}/child_comments?limit=20`, { timeout: 10000 });
  const cd = JSON.parse(child.body);
  hit = (cd.data || []).filter(c => strip(c.content) === replyText);
  if (hit.length) break;
}
if (!hit.length) fail("接口验证失败：目标评论及其线程 root 的子评论里都找不到刚发的回复");
console.log("OK 已发送，子评论 id:", hit[0].id, "author:", hit[0].author?.member?.name);
