#!/usr/bin/env node
// 知乎回答一键导入脚本（v2：走编辑器「导入」真实交互 + FileChooser）
// 用法：scripts/publish/import-answer.sh <定稿md路径> [问题URL]
//（sh 包装器把参数写入 /tmp/ego-import-args.json 后调本脚本；也可直接
//  ego-browser nodejs < 本脚本，但需事先写好该 json：{"md":"...","url":"..."}）
// 流程：接管 zhihu-draft 空间 → 打开问题页编辑器 → 清空编辑器（先退格再前删）
//   → 点「导入」→ 弹窗选「导入文档」→ 点「选择本地文档」→ FileChooser 选择本地 md
//   → 点「确认导入」类按钮 → 轮询校验正文与图片。
// 前提：
//   1. md 里的图片必须是图床外链（先跑 image-host-upload），导入器只认 http(s) 图；
//   2. md 首行一级标题（# ...）自动去掉（知乎回答不需要标题）；
//   3. md 文尾「图片溯源映射」HTML 注释块自动剥掉（标注「发布前删除」的那段）。
// 绝不点发布按钮，最后一步留给作者。
const fs = await import('node:fs');
const path = await import('node:path');

let args = {};
try { args = JSON.parse(fs.readFileSync('/tmp/ego-import-args.json', 'utf8')); } catch {}
const mdPath = args.md;
const questionUrl = args.url;
if (!mdPath) {
  console.error('用法：scripts/publish/import-answer.sh <定稿md路径> [问题URL]');
  process.exit(1);
}

// ---------- 1. 准备导入用 md ----------
const REPO = '/Users/jiangjun/Documents/kimi/Workspaces/zhihu';
const raw = fs.readFileSync(path.isAbsolute(mdPath) ? mdPath : path.join(REPO, mdPath), 'utf8');
const kept = [];
for (const l of raw.split('\n')) {
  if (l.startsWith('<!--')) break; // 图片溯源映射块，发布前删除
  if (/^#\s/.test(l)) continue;      // 回答标题 = 问题标题，不导入
  kept.push(l);
}
const md = kept.join('\n').trim() + '\n';
const imgUrls = [...md.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)].map(m => m[1]);
if (!imgUrls.length) console.log('⚠️ 文中没有外链图，导入后需手动处理图片');
const tmpMd = path.join('/tmp', path.basename(mdPath));
fs.writeFileSync(tmpMd, md);
console.log(`导入文件 ${tmpMd}，外链图 ${imgUrls.length} 张`);

// ---------- 2. 接管空间与页面 ----------
// 空间可能因用户接管而 ownership=user，按官方恢复模式取回
// 空间 id 会变，永远按名字 'zhihu-draft' 找；找不到才退回固定 id
const FALLBACK_SPACE_ID = 1;
const spaces = await listTaskSpaces();
const sEntry = spaces.find(s => s.name === 'zhihu-draft' && s.ownership !== 'user') || spaces.find(s => s.id === FALLBACK_SPACE_ID);
const task = !sEntry
  ? await taskSpace('zhihu-draft')
  : sEntry.ownership === 'user'
    ? await claimTaskSpace(sEntry.id)
    : sEntry.ownership === 'agentDelegatedToUser'
      ? await takeOverTaskSpace(sEntry.id)
      : await taskSpace(sEntry.id);
const url = questionUrl || (raw.match(/https:\/\/www\.zhihu\.com\/question\/\d+/) || [])[0];
if (!url) { console.error('找不到问题 URL，请作为第二个参数传入'); process.exit(1); }
const qid = (url.match(/question\/(\d+)/) || [])[1];

const tabs = await task.tabs();
let entry = tabs.find(t => (t.url || '').includes(`question/${qid}`));
let page;
if (entry) {
  page = entry.label ? task.page(entry.label) : await task.adopt(entry.page);
  console.log('复用已有问题标签页');
} else {
  page = task.page('p1');
  await page.goto(url, { waitUntil: 'load' });
  console.log('已打开问题页');
}
await page.waitForSelector('.public-DraftEditor-content[contenteditable=true]', { state: 'attached', timeout: 15000 }).catch(() => {});

// ---------- 3. 确保编辑器打开 ----------
let hasEditor = await page.evaluate(`!!document.querySelector('.public-DraftEditor-content[contenteditable=true]')`);
if (!hasEditor) {
  const clicked = await page.evaluate(`(()=>{
    const btns=[...document.querySelectorAll('button')];
    const b=btns.find(x=>{const t=(x.innerText||'').replace(/[\\u200b\\s]/g,'');return t==='写回答'||t==='编辑回答';});
    if(!b) return 'no-button';
    b.click(); return 'clicked:'+b.innerText.trim();
  })()`);
  console.log('打开编辑器:', clicked);
  if (clicked === 'no-button') { console.error('找不到写回答按钮'); process.exit(1); }
  await page.waitForSelector('.public-DraftEditor-content[contenteditable=true]', { state: 'attached', timeout: 15000 });
}

// ---------- 4. 清空编辑器（Draft.js：循环派发退格/前删，勿用 selectAll） ----------
await page.evaluate(`document.querySelector('.public-DraftEditor-content[contenteditable=true]').focus()`);
for (let round = 0; round < 30; round++) {
  const st = await page.evaluate(`(()=>{
    const e=document.querySelector('.public-DraftEditor-content');
    for(let i=0;i<400;i++) e.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',keyCode:8,which:8,bubbles:true,cancelable:true}));
    return JSON.stringify({chars:e.innerText.trim().length, blocks:e.querySelectorAll('[data-block]').length, imgs:e.querySelectorAll('img').length});
  })()`);
  const s = JSON.parse(st);
  console.log(`清空-退格${round}: 字数=${s.chars} 块=${s.blocks} 图=${s.imgs}`);
  if (s.chars === 0 && s.blocks <= 1 && s.imgs === 0) break;
  if (s.chars === 0 && round >= 3) {
    // 还剩 atomic 块（图片）时退格删不动，换前删
    const st2 = await page.evaluate(`(()=>{
      const e=document.querySelector('.public-DraftEditor-content');
      for(let i=0;i<200;i++) e.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',keyCode:46,which:46,bubbles:true,cancelable:true}));
      return JSON.stringify({chars:e.innerText.trim().length, blocks:e.querySelectorAll('[data-block]').length, imgs:e.querySelectorAll('img').length});
    })()`);
    const s2 = JSON.parse(st2);
    console.log(`清空-前删${round}: 字数=${s2.chars} 块=${s2.blocks} 图=${s2.imgs}`);
    if (s2.chars === 0 && s2.blocks <= 1 && s2.imgs === 0) break;
  }
}

// ---------- 5. 点「导入」→ 菜单「导入文档」→ 「选择本地文档」→ 文件框 ----------
// 0) 关掉可能残留的上一次弹窗，保证从干净状态开始
await page.evaluate(`(()=>{
  const m=document.querySelector('.Modal--default');
  if(m){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,which:27,bubbles:true})); }
  const mask=document.querySelector('.Modal-backdrop');
  if(mask) mask.click();
})()`).catch(() => {});
await new Promise(r => setTimeout(r, 600));
// 5.1 工具栏「导入」按钮（ToolbarButton，点击后弹出菜单）
const importClicked = await page.evaluate(`(()=>{
  const b=[...document.querySelectorAll('button.ToolbarButton')].find(x=>/导入/.test(x.innerText||''));
  if(!b) return 0;
  b.click(); return 1;
})()`);
console.log('点工具栏「导入」:', importClicked);
if (!importClicked) { console.error('没找到导入按钮'); process.exit(1); }
await page.waitForSelector('.ToolbarV3Menu-container .Menu button[aria-label=导入文档]', { state: 'visible', timeout: 8000 });

// 5.2 菜单里点「导入文档」（aria-label 定位，菜单项是 button 不是 li）
const docTab = await page.evaluate(`(()=>{
  const b=document.querySelector('.ToolbarV3Menu-container .Menu button[aria-label=导入文档]') || document.querySelector('button[aria-label=导入文档]');
  if(!b) return 'not-found';
  b.click(); return 'clicked';
})()`);
console.log('选「导入文档」:', docTab);
if (docTab !== 'clicked') { console.error('没找到导入文档菜单项'); process.exit(1); }
await page.waitForSelector('.Modal--default', { state: 'visible', timeout: 8000 });
console.log('导入弹窗已打开');

// 5.3 点弹窗上传区（role=button 的拖放区），用 FileChooser 选本地 md；
//     弹窗内另有隐藏 input[type=file accept~=.md]，文件框方案失败时兜底直接喂它
let fileSet = false;
try {
  const chooserPromise = page.waitForFileChooser({ timeout: 10000 });
  await page.evaluate(`(()=>{
    const panel=document.querySelector('.Modal--default [role=tabpanel]');
    const area=panel ? panel.querySelector('[role=button]') : null;
    if(area) area.click();
  })()`);
  const chooser = await chooserPromise;
  await chooser.setFiles(tmpMd);
  fileSet = true;
  console.log('已通过文件框选择:', tmpMd);
} catch (e) {
  console.log('文件框路径失败，改用隐藏 input:', String(e).slice(0, 120));
}
if (!fileSet) {
  await page.setInputFiles('.Modal input[type=file][accept*=md]', [tmpMd]);
  console.log('已通过隐藏 input 注入:', tmpMd);
}

// ---------- 6. 导入确认（覆盖/确认导入） ----------
for (let i = 0; i < 8; i++) {
  const clicked = await page.evaluate(`(()=>{
    const b=[...document.querySelectorAll('button')].find(x=>/确认导入|确认|覆盖|替换/.test((x.innerText||'').trim()) && x.offsetParent!==null);
    if(b){b.click();return b.innerText.trim();} return '';
  })()`);
  if (clicked) { console.log('点了确认按钮:', clicked); break; }
  await new Promise(r => setTimeout(r, 1000));
}

// ---------- 7. 轮询校验（导入是后台转换，拉外链图更慢） ----------
const expectChars = md.replace(/[#*!()[\]-]/g, '').length;
// 结尾校验标记：取正文最后一个非空行的前 12 字（每篇稿子的结尾句不同）
const tailMark = (md.split('\n').filter(l => l.trim() && !l.trim().startsWith('!') && !l.trim().startsWith('图源')).pop() || '').replace(/[#*!()[\]> -]/g, '').slice(0, 12);
let ok = false;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const st = await page.evaluate(`(()=>{
    const e=document.querySelector('.public-DraftEditor-content');
    if(!e) return null;
    const t=e.innerText;
    const imgs=[...e.querySelectorAll('img')];
    const zhimg=imgs.filter(i=>/zhimg\\.com|pic-private\\.zhihu/.test(i.src)).length;
    const remote=imgs.filter(i=>/^https?:/.test(i.src)&&!/zhimg|pic-private/.test(i.src)).length;
    const tail=(t.match(new RegExp(${JSON.stringify(tailMark)}.replace(/[.*+?^$\{\}()|\[\]\\]/g,'\\$&'),'g'))||[]).length;
    return JSON.stringify({chars:t.length, blocks:e.querySelectorAll('[data-block]').length, imgs:imgs.length, zhimg, remote, tail, head:t.slice(0,30)});
  })()`);
  if (!st) continue;
  const s = JSON.parse(st);
  console.log(`轮询${i}: 字数=${s.chars} 块=${s.blocks} 图=${s.imgs}(知乎图床${s.zhimg}) 外链残留=${s.remote} 结尾段重复=${s.tail}`);
  const textOk = s.chars > expectChars * 0.5 && (!tailMark || s.tail >= 1);
  const imgOk = imgUrls.length === 0 || (s.imgs === imgUrls.length && s.zhimg === imgUrls.length && s.remote === 0);
  if (textOk && imgOk) {
    await new Promise(r => setTimeout(r, 4000));
    const st2 = JSON.parse(await page.evaluate(`(()=>{const e=document.querySelector('.public-DraftEditor-content');const imgs=[...e.querySelectorAll('img')];return JSON.stringify({chars:e.innerText.length,imgs:imgs.length,zhimg:imgs.filter(i=>/zhimg\\.com|pic-private\\.zhihu/.test(i.src)).length,remote:imgs.filter(i=>/^https?:/.test(i.src)&&!/zhimg|pic-private/.test(i.src)).length})})()`));
    console.log('确认轮:', JSON.stringify(st2));
    ok = imgUrls.length === 0 || (st2.imgs === imgUrls.length && st2.zhimg === imgUrls.length && st2.remote === 0);
    if (ok && st2.chars > expectChars * 0.5) break;
    ok = false;
  }
}
try { fs.unlinkSync(tmpMd); } catch {}
console.log(ok ? '✅ 导入完成，请到编辑器检查后点发布' : '⚠️ 校验未完全通过，请人工检查编辑器');
