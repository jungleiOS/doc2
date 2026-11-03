// 用法：ego-browser nodejs < scrape-answers.mjs
// 前置：同目录 marked-users.json 为标记用户列表（由 mark-users.user.js 导出）
// 输出：同目录 scraped-answers.json（每用户最近 3 条回答 + 对应问题）
//
// 风控策略：
// - 每用户间隔 2 秒；连续 3 个用户 API 失败立即熔断停止
// - 单用户 API 失败时降级为 DOM 抓取（渲染回答列表页，不碰 API）

const task = await taskSpace("zhihu-marked-scout");
const page = task.page("p1");
await page.goto("https://www.zhihu.com/");

const fs = await import("node:fs/promises");
const path = await import("node:path");
const dir = "/Users/jiangjun/Documents/kimi/Workspaces/zhihu/tools/zhihu-marked-scout";

const users = JSON.parse(await fs.readFile(path.join(dir, "marked-users.json"), "utf8"));
console.log(`共 ${users.length} 个标记用户`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let consecutiveFailures = 0;

// 降级方案：渲染 /answers 页面，从 DOM 提取最近 3 条回答的问题信息
async function scrapeFromDom(user) {
  await page.goto(`https://www.zhihu.com/people/${user.token}/answers`);
  await page.waitForSelector('a[href*="/question/"]', { timeout: 10_000 }).catch(() => {});
  return await page.evaluate(() => {
    const seen = new Set();
    const out = [];
    for (const a of document.querySelectorAll('a[href*="/question/"]')) {
      const m = a.href.match(/zhihu\.com\/question\/(\d+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      const card = a.closest(".AnswerItem, .ContentItem, li");
      const timeEl = card ? card.querySelector(".ContentItem-time") : null;
      out.push({
        answerUrl: null,
        questionId: m[1],
        questionTitle: a.textContent.trim(),
        questionUrl: `https://www.zhihu.com/question/${m[1]}`,
        createdTime: timeEl ? (timeEl.textContent.match(/\d{4}-\d{2}-\d{2}/) || [null])[0] : null,
        excerpt: "",
      });
      if (out.length >= 3) break;
    }
    return out;
  });
}

for (const user of users) {
  if (consecutiveFailures >= 3) {
    console.log("连续 3 个用户失败，熔断停止——可能触发风控，请稍后再试或减小批量");
    results.push({ token: user.token, name: user.name, error: "circuit-breaker: skipped" });
    break;
  }
  try {
    const res = await page.fetch(
      `https://www.zhihu.com/api/v4/members/${user.token}/answers?limit=3&offset=0&sort_by=created&include=data[*].question.title,data[*].created_time`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = JSON.parse(res.body);
    if (!Array.isArray(body.data) || body.data.length === 0) throw new Error("empty data");
    consecutiveFailures = 0;
    results.push({
      token: user.token,
      name: user.name,
      answers: body.data.map((a) => ({
        answerUrl: `https://www.zhihu.com/answer/${a.id}`,
        questionId: a.question ? a.question.id : null,
        questionTitle: a.question ? a.question.title : null,
        questionUrl: a.question ? `https://www.zhihu.com/question/${a.question.id}` : null,
        createdTime: a.created_time ? new Date(a.created_time * 1000).toISOString().slice(0, 10) : null,
        excerpt: (a.excerpt || "").slice(0, 120),
      })),
    });
    console.log(`${user.name}: API 成功 ${body.data.length} 条`);
  } catch (e) {
    console.log(`${user.name} API 失败(${e.message})，降级 DOM 抓取…`);
    try {
      const answers = await scrapeFromDom(user);
      consecutiveFailures = answers.length > 0 ? 0 : consecutiveFailures + 1;
      results.push({ token: user.token, name: user.name, via: "dom", answers });
      console.log(`${user.name}: DOM 抓取 ${answers.length} 条`);
    } catch (e2) {
      consecutiveFailures += 1;
      console.log(`${user.name} DOM 也失败: ${e2.message}`);
      results.push({ token: user.token, name: user.name, error: e2.message });
    }
  }
  await sleep(2000);
}

const out = path.join(dir, "scraped-answers.json");
await fs.writeFile(out, JSON.stringify(results, null, 2));
console.log(`已写入 ${out}`);
