#!/usr/bin/env node
/**
 * image-host-upload：把 Markdown 里的本地图片引用一键替换为临时图床 URL。
 *
 * 用法：node upload.js <文章.md> [--time 12h] [--force]
 *
 * - 输出 <原名去掉.md>-hosted.md（与原稿同目录），不改动原稿
 * - 缓存：项目根目录 .image-host-cache.json（绝对路径::大小::mtimeMs -> 图床URL）
 *   缓存永久保留，即使图床过期也能据此找回本地原图，不要删
 * - 图床链：imgchr 路过图床（国内主）→ uguu → litterbox → tmpfiles（后三个境外，兜底）
 * - 退出码：全部成功 0，有失败 1
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const CACHE_FILE = path.join(PROJECT_ROOT, '.image-host-cache.json');
const UA = 'image-host-upload/1.0 (+zhihu-writing-project)';
const CONCURRENCY = 3;
const VALID_TIMES = ['1h', '12h', '24h', '72h'];

// ---------- 命令行参数 ----------

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { time: '12h', force: false, file: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
      opts.force = true;
    } else if (args[i] === '--time') {
      opts.time = args[++i];
    } else if (args[i].startsWith('--time=')) {
      opts.time = args[i].slice('--time='.length);
    } else if (!opts.file) {
      opts.file = args[i];
    } else {
      usageExit(1, `未知参数：${args[i]}`);
    }
  }
  if (!opts.file) usageExit(1, '缺少文章路径');
  if (!VALID_TIMES.includes(opts.time)) {
    usageExit(1, `--time 只支持 ${VALID_TIMES.join('/')}，收到：${opts.time}`);
  }
  return opts;
}

function usageExit(code, msg) {
  if (msg) console.error(`错误：${msg}`);
  console.error('用法：node upload.js <文章.md> [--time 12h] [--force]');
  process.exit(code);
}

// ---------- 缓存 ----------

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

function cacheKey(absPath, stat) {
  return `${absPath}::${stat.size}::${Math.round(stat.mtimeMs)}`;
}

// ---------- 图床（每个图床一个独立函数，按顺序依次尝试） ----------

function makeForm(fields, fileField, buf, filename, mime) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append(fileField, new Blob([buf], { type: mime }), filename);
  return fd;
}

/** 主图床：imgchr.com 路过图床（Chevereto，国内免注册）。
 *  需先从首页抓取 auth_token 和会话 Cookie，两者配套使用，每次运行抓取一次。 */
let imgchrToken = null;
let imgchrCookie = null;

async function imgchrInit() {
  const res = await fetch('https://imgchr.com/', { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`imgchr 首页 HTTP ${res.status}`);
  const html = await res.text();
  const m = /auth_token\s*=\s*"([a-f0-9]{32,64})"/.exec(html);
  if (!m) throw new Error('imgchr 首页未找到 auth_token');
  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
  imgchrToken = m[1];
  imgchrCookie = setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function uploadToImgchrOnce(buf, filename) {
  const fd = makeForm(
    { auth_token: imgchrToken, type: 'file', action: 'upload' },
    'source', buf, filename, mimeOf(filename),
  );
  const res = await fetch('https://imgchr.com/json', {
    method: 'POST',
    headers: { 'User-Agent': UA, Cookie: imgchrCookie },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  const url = json && json.image && json.image.url;
  if (json.status_code !== 200 || !url) {
    const msg = (json.error && json.error.message) || JSON.stringify(json).slice(0, 120);
    throw new Error(`imgchr HTTP ${res.status}：${msg}`);
  }
  return url;
}

/** 主图床：imgchr.com 路过图床（免注册、国内可达、无防盗链，2026-09-14 实测）。
 *  官方无过期声明，同 md5 会拒绝重复上传（按失败交给下一图床）。 */
async function uploadToImgchr(buf, filename) {
  if (!imgchrToken) await imgchrInit();
  try {
    const url = await uploadToImgchrOnce(buf, filename);
    return { url, host: 'imgchr', expiresIn: 'none' };
  } catch (err) {
    if (!/auth_token/.test(err.message)) throw err;
    // token 失效则刷新一次重试
    await imgchrInit();
    const url = await uploadToImgchrOnce(buf, filename);
    return { url, host: 'imgchr', expiresIn: 'none' };
  }
}

/** 兜底图床：litterbox.catbox.moe（境外，免注册，1h/12h/24h/72h 自动过期。
 *  2026-09-12 实测本网络返回 HTTP 500，仅作链尾兜底） */
async function uploadToLitterbox(buf, filename, time) {
  const fd = makeForm({ reqtype: 'fileupload', time }, 'fileToUpload', buf, filename, mimeOf(filename));
  const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    headers: { 'User-Agent': UA },
    body: fd,
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//.test(text)) {
    throw new Error(`litterbox HTTP ${res.status}：${text.slice(0, 120)}`);
  }
  return { url: text, host: 'litterbox', expiresIn: time };
}

/** 兜底图床：tmpfiles.org（免注册，1 小时后过期），data.url 需转为 /dl/ 直链 */
async function uploadToTmpfiles(buf, filename) {
  const fd = makeForm({}, 'file', buf, filename, mimeOf(filename));
  const res = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    headers: { 'User-Agent': UA },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  const url = json && json.data && json.data.url;
  if (!res.ok || !url) {
    throw new Error(`tmpfiles HTTP ${res.status}：${JSON.stringify(json).slice(0, 120)}`);
  }
  return { url: url.replace('://tmpfiles.org/', '://tmpfiles.org/dl/'), host: 'tmpfiles', expiresIn: '1h' };
}

/** 兜底图床 2：uguu.se（pomf 系，境外，免费免注册，约 3 小时过期）。
 *  2026-09-12 实测本网络境外图床中唯一可用，现退居 imgchr 之后的兜底。 */
async function uploadToUguu(buf, filename) {
  const fd = makeForm({}, 'files[]', buf, filename, mimeOf(filename));
  const res = await fetch('https://uguu.se/upload', {
    method: 'POST',
    headers: { 'User-Agent': UA },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  const url = json && Array.isArray(json.files) && json.files[0] && json.files[0].url;
  if (!res.ok || !json.success || !url) {
    throw new Error(`uguu HTTP ${res.status}：${JSON.stringify(json).slice(0, 120)}`);
  }
  return { url, host: 'uguu', expiresIn: '3h' };
}

const HOSTS = [
  (buf, filename) => uploadToImgchr(buf, filename),
  (buf, filename) => uploadToUguu(buf, filename),
  (buf, filename, time) => uploadToLitterbox(buf, filename, time),
  (buf, filename) => uploadToTmpfiles(buf, filename),
];

async function uploadWithFallback(buf, filename, time) {
  const errors = [];
  for (const host of HOSTS) {
    try {
      return await host(buf, filename, time);
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(' → '));
}

function mimeOf(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.avif': 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}

// ---------- Markdown 图片引用解析 ----------

const RE_MD_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const RE_IMG_TAG = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** 是否已是外链或内嵌数据，无需处理 */
function isRemote(ref) {
  return /^(https?:)?\/\//i.test(ref) || /^data:/i.test(ref);
}

/**
 * 从 Markdown 文本中收集所有本地图片引用。
 * 返回 [{ raw, absPath, displayPath }]；raw 为引用中的原始写法，用于精确替换。
 */
function collectRefs(content, mdDir) {
  const refs = [];
  const seen = new Set();
  for (const re of [RE_MD_IMAGE, RE_IMG_TAG]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const raw = m[1];
      if (isRemote(raw)) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        decoded = raw;
      }
      const absPath = path.resolve(mdDir, decoded);
      if (seen.has(absPath)) continue;
      seen.add(absPath);
      refs.push({ raw, absPath, displayPath: decoded });
    }
  }
  return refs;
}

function replaceRefs(content, replacements) {
  let out = content;
  for (const { raw, url } of replacements) {
    // 只替换图片引用语境里的路径，不影响正文同名文本
    out = out.split(`](${raw}`).join(`](${url}`);
    out = out.split(`src="${raw}"`).join(`src="${url}"`);
    out = out.split(`src='${raw}'`).join(`src='${url}'`);
  }
  return out;
}

// ---------- 并发上传 ----------

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

// ---------- 主流程 ----------

function parseExpiresIn(expiresIn, fromMs) {
  if (expiresIn === 'none') return '无过期声明（仍当临时用）';
  const m = /^(\d+)h$/.exec(expiresIn || '');
  if (!m) return '未知';
  return new Date(fromMs + Number(m[1]) * 3600 * 1000).toLocaleString('zh-CN', { hour12: false });
}

async function main() {
  const opts = parseArgs(process.argv);
  const mdPath = path.resolve(opts.file);
  if (!mdPath.toLowerCase().endsWith('.md')) usageExit(1, '只支持 .md 文件');
  if (!fs.existsSync(mdPath)) usageExit(1, `文件不存在：${mdPath}`);

  const content = fs.readFileSync(mdPath, 'utf8');
  const refs = collectRefs(content, path.dirname(mdPath));
  if (refs.length === 0) {
    console.log('未在文中发现本地图片引用，无需处理。');
    return;
  }

  const cache = loadCache();
  const rows = [];       // 清单行：{ no, displayPath, url, expiresAt, status }
  const failures = [];   // { displayPath, reason }
  let uploaded = 0;
  let cacheHits = 0;

  await runWithConcurrency(refs, CONCURRENCY, async (ref, i) => {
    let stat = null;
    try {
      stat = fs.statSync(ref.absPath);
      if (!stat.isFile()) throw new Error('不是常规文件');
    } catch (err) {
      failures.push({ displayPath: ref.displayPath, reason: `本地文件不可读：${err.message}` });
      rows[i] = { no: i + 1, displayPath: ref.displayPath, url: '（保留本地路径）', expiresAt: '-', status: '失败' };
      return;
    }

    const key = cacheKey(ref.absPath, stat);
    if (!opts.force && cache[key]) {
      const hit = cache[key];
      cacheHits++;
      rows[i] = {
        no: i + 1,
        displayPath: ref.displayPath,
        url: hit.url,
        expiresAt: parseExpiresIn(hit.expiresIn, hit.uploadedAt),
        status: `缓存(${hit.host})`,
      };
      return;
    }

    try {
      const buf = fs.readFileSync(ref.absPath);
      const { url, host, expiresIn } = await uploadWithFallback(buf, path.basename(ref.absPath), opts.time);
      cache[key] = { url, uploadedAt: Date.now(), host, expiresIn };
      uploaded++;
      rows[i] = {
        no: i + 1,
        displayPath: ref.displayPath,
        url,
        expiresAt: parseExpiresIn(expiresIn, Date.now()),
        status: '已上传',
      };
    } catch (err) {
      failures.push({ displayPath: ref.displayPath, reason: err.message });
      rows[i] = { no: i + 1, displayPath: ref.displayPath, url: '（保留本地路径）', expiresAt: '-', status: '失败' };
    }
  });

  saveCache(cache);

  // 打印清单
  console.log('\n序号 | 本地路径 | 图床URL | 过期时间 | 状态');
  console.log('--- | --- | --- | --- | ---');
  for (const r of rows) {
    console.log(`${r.no} | ${r.displayPath} | ${r.url} | ${r.expiresAt} | ${r.status}`);
  }
  console.log(`\n共 ${refs.length} 张，上传 ${uploaded} 张，命中缓存 ${cacheHits} 张`);

  if (failures.length > 0) {
    console.log('\n失败列表（文中保留原本地路径引用）：');
    for (const f of failures) console.log(`- ${f.displayPath}：${f.reason}`);
  }

  // 无论是否有失败都生成 -hosted.md，成功的替换为图床 URL，失败的保留本地路径
  const replacements = rows
    .map((r, i) => ({ r, ref: refs[i] }))
    .filter(({ r }) => r.status !== '失败')
    .map(({ r, ref }) => ({ raw: ref.raw, url: r.url }));
  const newContent = replaceRefs(content, replacements);
  const outPath = mdPath.replace(/\.md$/i, '') + '-hosted.md';
  fs.writeFileSync(outPath, newContent, 'utf8');
  console.log(`\n已生成：${outPath}`);
  console.log('提示：图床仅几小时有效，发布到知乎/百家号后请确认平台已转存图片（以实际显示为准）。');

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`运行失败：${err.stack || err}`);
  process.exit(1);
});
