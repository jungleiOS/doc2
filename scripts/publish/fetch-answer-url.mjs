#!/usr/bin/env node
// 捞自己已发布回答的链接
// 用法：scripts/publish/fetch-answer-url.sh <问题URL>
//（sh 包装器把参数写入 /tmp/ego-fetch-args.json；也可直接 ego-browser nodejs < 本脚本）
// 原理：打开问题页，自己回答的卡片上有「编辑回答」按钮，向上找到回答卡片容器，
//   取卡片内指向 /answer/{id} 的永久链接，输出规范链接 https://www.zhihu.com/answer/{id}。
const fs = await import('node:fs');

let args = {};
try { args = JSON.parse(fs.readFileSync('/tmp/ego-fetch-args.json', 'utf8')); } catch {}
const questionUrl = args.url;
if (!questionUrl) {
  console.error('用法：scripts/publish/fetch-answer-url.sh <问题URL>');
  process.exit(1);
}
const qid = (questionUrl.match(/question\/(\d+)/) || [])[1];
if (!qid) { console.error('URL 里找不到问题 id'); process.exit(1); }

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
const tabs = await task.tabs();
let entry = tabs.find(t => (t.url || '').includes(`question/${qid}`));
let page;
if (entry) {
  page = entry.label ? task.page(entry.label) : await task.adopt(entry.page);
} else {
  page = task.page('p1');
  await page.goto(questionUrl, { waitUntil: 'load' });
}
await new Promise(r => setTimeout(r, 3000));

// 自己已发布的回答卡片才带「编辑回答」按钮；未发布/纯草稿时捞不到
const found = await page.evaluate(`(()=>{
  const editBtns=[...document.querySelectorAll('button, a')].filter(e=>{
    const t=(e.innerText||'').replace(/[\\u200b\\s]/g,'');
    return t==='编辑回答';
  });
  if(!editBtns.length) return null;
  // 从按钮向上找回答卡片（ContentItem/AnswerItem），取卡片内 /answer/{id} 永久链接
  for(const b of editBtns){
    let el=b;
    for(let i=0;i<12 && el;i++){
      el=el.parentElement;
      if(!el) break;
      const a=el.querySelector && el.querySelector('a[href*="/answer/"]');
      if(a){
        const m=a.href.match(/answer\\/(\\d+)/);
        if(m) return { aid: m[1], href: a.href };
      }
    }
  }
  return null;
})()`);

if (!found) {
  console.error('未找到「编辑回答」按钮，可能回答还没发布成功或页面未加载完，请人工确认');
  process.exit(1);
}
console.log(`https://www.zhihu.com/answer/${found.aid}`);
