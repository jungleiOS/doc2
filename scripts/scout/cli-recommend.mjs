// 知乎官方 CLI 推荐问题采集（scout 第 0 步「官方问题发现」的脚本化实现）
//
// 用途：替代 scout-common.md 中由 agent 手动执行的 CLI 调用，防止漏跑。
// 行为：画像模式 2 次 + 主题模式按领域关键词 3 次，去重后输出全部推荐题。
// 配额：question_discovery 100 次/自然日，本脚本固定 5 次，充裕。
//
// 用法：
//   node scripts/scout/cli-recommend.mjs            # 打印 "id1,id2,..."，可直接作 pipeline 的 ids 参数
//   node scripts/scout/cli-recommend.mjs --json     # 打印含标题的 JSON 明细
//   node scripts/scout/cli-recommend.mjs --save     # 额外落盘 data/raw/cli-recommend-YYYY-MM-DD.json
// 退出码非 0 表示 CLI 调用失败（配额耗尽/未登录等），调用方必须中止本轮而不是静默跳过。
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const CLI = path.join(process.env.HOME, 'Library/Application Support/zhihu-cli/current/zhihu-cli');
// 主题关键词：与 scout-common.md 第 0 步的领域示例保持一致，按当前稿族重心配置
const TOPIC_QUERIES = ['AI 编程', '充电器', 'iPad'];
const PROFILE_ROUNDS = 2;
const COUNT = 20;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const save = args.includes('--save');

function recommend(query) {
  const argv = [CLI, 'question', 'recommend', '--count', String(COUNT)];
  if (query) argv.push('--query', query);
  const out = execFileSync(argv[0], argv.slice(1), { encoding: 'utf8', timeout: 30000 });
  const data = JSON.parse(out);
  if (data.Code !== 0) throw new Error(`CLI 返回 Code=${data.Code}: ${data.Message}`);
  return (data.Data?.Items ?? []).map((it) => {
    const m = /question\/(\d+)/.exec(it.Url || '');
    return m ? { id: m[1], title: it.Title, url: it.Url } : null;
  }).filter(Boolean);
}

const calls = [...Array(PROFILE_ROUNDS).fill(null), ...TOPIC_QUERIES];
const seen = new Map();
for (const q of calls) {
  for (const item of recommend(q)) {
    if (!seen.has(item.id)) seen.set(item.id, { ...item, query: q ?? '画像' });
  }
}
const items = [...seen.values()];

if (save) {
  const today = new Date().toLocaleDateString('sv-SE');
  const file = path.join(repoRoot, 'data/raw', `cli-recommend-${today}.json`);
  writeFileSync(file, JSON.stringify({ date: today, items }, null, 2));
  console.error(`已保存 ${items.length} 题到 ${path.relative(repoRoot, file)}`);
  // 落盘即入库，避免推荐数据只堆在 data/raw
  try {
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts/db/import.mjs')], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    console.error('已同步到 data/zhihu.db（recommend_items 表）');
  } catch (err) {
    console.error(`入库失败（原始文件已保留，可稍后手动跑 sync）：${err.message}`);
  }
}
if (asJson) {
  console.log(JSON.stringify(items, null, 2));
} else {
  console.log(items.map((i) => i.id).join(','));
}
