// 看板复扫：每天一次，对已选未答的高分题复抓统计快照并算增量。
//
// 解决「题选好了还没答，放在那里起量/冷却了不知道」：选题精评只在选题轮发生，
// 已选未答题两次选题之间的数据断档由本脚本补齐。
//
// 运行方式（必须在 ego-browser nodejs 环境，参数走 globalThis.SCOUT_CFG 前置 snippet，
// 与 scout-pipeline.mjs collect 相同）：
//   echo "globalThis.SCOUT_CFG={root:'<仓库根>'};" | cat scripts/scout/watchlist-refetch.mjs - | ego-browser nodejs
//   也可 node scripts/scout/watchlist-refetch.mjs --root <仓库根> --dry（不访问浏览器，只列看板清单）
//
// 看板口径：选题历史.md 中【已选未答】且评分 >60 且登记 ≤7 天的题（与 scout 回捞高分档同口径），
// 按分数降序取前 MAX 题。结果写 data/raw/watchlist-refetch-YYYY-MM-DD.json，
// 并在 stdout 打 SUMMARY:<n> 供调度方解析。
import fs from 'node:fs';
import path from 'node:path';

const CFG = globalThis.SCOUT_CFG || {};
const args = process.argv.slice(1);
if (/\.m?js$/.test(args[0] || '')) args.shift();
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const hasFlag = (name) => args.includes(`--${name}`);
const today = () => new Date().toISOString().slice(0, 10);
const root = path.resolve(flag('root', CFG.root || process.cwd()));
const MAX = Number(flag('max', CFG.max || 15));
const SCORE_MIN = 60;
const AGE_MAX_DAYS = 7;

// 与 scout-pipeline.mjs parseHistory 同口径（只取本题需要的字段）
function parseWatchlist(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|') || !line.includes('【已选未答】')) continue;
    const idm = line.match(/question\/(\d+)/) || line.match(/\|\s*(?:普通|带货|复盘)?\s*\|?\s*(\d{6,})/);
    if (!idm) continue;
    const dm = line.match(/\|\s*(20\d{2}-\d{2}-\d{2})\s*\|/);
    const sm = line.match(/(\d{1,3}(?:\.\d+)?)\s*分/);
    out.push({
      id: idm[1],
      date: dm ? dm[1] : null,
      score: sm ? parseFloat(sm[1]) : null,
    });
  }
  return out;
}

const histFile = path.join(root, 'outlines', '选题历史.md');
if (!fs.existsSync(histFile)) {
  console.log('SUMMARY:0 无选题历史');
  process.exit(0);
}
const ageOf = (d) => (d ? Math.floor((new Date(today()) - new Date(d)) / 864e5) : null);
// 同一题可能有多行【已选未答】（登记行 + 后续更新行），按 id 去重保留最早登记行
const byId = new Map();
for (const w of parseWatchlist(fs.readFileSync(histFile, 'utf8'))) {
  if (!byId.has(w.id)) byId.set(w.id, w);
}
const watchlist = [...byId.values()]
  .filter((w) => w.score != null && w.score > SCORE_MIN && w.date && ageOf(w.date) <= AGE_MAX_DAYS)
  .sort((a, b) => b.score - a.score)
  .slice(0, MAX);
console.log(`看板 ${watchlist.length} 题（>${SCORE_MIN}分 且 ≤${AGE_MAX_DAYS}天）：${watchlist.map((w) => `${w.id}(${w.score}分)`).join(' ') || '空'}`);

if (hasFlag('dry')) process.exit(0);
if (!watchlist.length) { console.log('SUMMARY:0 看板为空'); process.exit(0); }

// ---- 浏览器复抓（单页面 + 节流 + 收尾关窗，红线同 scout-pipeline）----
const snapFile = path.join(root, 'data', 'raw', 'question-snapshots.jsonl');
const dataDir = path.join(root, 'data', 'raw');
fs.mkdirSync(dataDir, { recursive: true });

// 上一次快照（严格早于今天）
const prevSnap = {};
if (fs.existsSync(snapFile)) {
  for (const line of fs.readFileSync(snapFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.date && r.date < today() && r.id) prevSnap[r.id] = r;
    } catch { /* 跳过坏行 */ }
  }
}

const STATS = `(()=>{const t=document.body.innerText;const num=re=>{const m=t.match(re);if(!m)return 0;const v=parseFloat(m[1].replace(/,/g,""));return Math.round(v*(/万/.test(m[0])?1e4:1))};const ups=[...document.querySelectorAll(".ContentItem.AnswerItem, .List-item")].map(el=>{const m=(el.innerText||"").match(/([\\d.,]+万?)\\s*人赞同了该回答/);if(!m)return null;const v=parseFloat(m[1].replace(/,/g,""));return Math.round(v*(/万/.test(m[0])?1e4:1))}).filter(v=>v!==null);return JSON.stringify({follow:num(/关注者\\s*([\\d.,]+万?)/),view:num(/被浏览\\s*([\\d.,]+万?)/),answers:num(/([\\d.,]+万?)\\s*个回答/),topUps:ups.slice(0,5)})})()`;
const T5 = (ups) => (ups && ups.length >= 5 ? ups[4] : null);

const task = await taskSpace('zhihu-watchlist');
let page = null;
try { page = await task.page('p1'); } catch { page = null; }
if (!page) page = await task.newPage('p1');

const rows = [];
try {
  for (const w of watchlist) {
    await new Promise((r) => setTimeout(r, 6000 + Math.random() * 6000));
    try {
      await page.goto(`https://www.zhihu.com/question/${w.id}`);
      await new Promise((r) => setTimeout(r, 3000));
      const stats = JSON.parse(await page.evaluate(STATS));
      const cur = { followers: stats.follow, views: stats.view, answers: stats.answers, topUps: stats.topUps };
      fs.appendFileSync(snapFile, JSON.stringify({ date: today(), id: w.id, ...cur, newIn30d: null, source: '复扫' }) + '\n');
      const prev = prevSnap[w.id];
      const delta = prev ? {
        since: prev.date,
        followers: cur.followers - prev.followers,
        views: cur.views - prev.views,
        answers: cur.answers - prev.answers,
        T: T5(cur.topUps) != null && T5(prev.topUps) != null ? T5(cur.topUps) - T5(prev.topUps) : null,
      } : null;
      rows.push({ ...w, cur, delta, error: null });
      console.log(`  ${w.id} 关注${cur.followers} 浏览${cur.views} 回答${cur.answers}${delta ? ` Δ关注${delta.followers >= 0 ? '+' : ''}${delta.followers} Δ浏览${delta.views >= 0 ? '+' : ''}${delta.views}` : '（无历史快照）'}`);
    } catch (e) {
      rows.push({ ...w, cur: null, delta: null, error: e.message });
      console.log(`  ${w.id} 复抓失败：${e.message}`);
    }
    try { await page.goto('about:blank'); } catch { }
  }
} finally {
  try { await page.close(); } catch { }
  try { await completeTaskSpace('zhihu-watchlist', { keep: false }); } catch { }
}

const outFile = path.join(dataDir, `watchlist-refetch-${today()}.json`);
fs.writeFileSync(outFile, JSON.stringify({ date: today(), rows }, null, 2));
const rising = rows.filter((r) => r.delta && (r.delta.followers > 10 || r.delta.views > 2000));
console.log(`SUMMARY:${rows.length} 起量${rising.length} 明细:${outFile}`);
