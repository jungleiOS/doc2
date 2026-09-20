const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'table-data.json'), 'utf8'));
const mdPath = path.join(__dirname, '..', '商品分析.md');
let md = fs.readFileSync(mdPath, 'utf8');

// 把所有型号扁平化
const allItems = [...data.entry_series, ...data.performance_series, ...data.premium_series];

function normalize(str) {
  return str.toLowerCase()
    .replace(/[\s英寸"]/g, '')
    .replace(/联想/g, '')
    .replace(/拯救者/g, '')
    .replace(/小新/g, '')
    .replace(/异能者/g, '')
    .replace(/来酷/g, '')
    .replace(/yoga/g, 'yoga')
    .replace(/pad/g, 'pad')
    .replace(/pro/g, 'pro')
    .replace(/[（(].*?[）)]/g, '');
}

function findItemByName(name) {
  const key = normalize(name);
  for (const item of allItems) {
    const itemKey = normalize(item.name);
    if (key.includes(itemKey) || itemKey.includes(key)) return item;
  }
  return null;
}

function buildSpecBlock(item) {
  return `**官方参数**

- 处理器：${item.processor || '—'}
- 屏幕：${item.screen || '—'}
- 内存/存储：${item.ram_storage || '—'}
- 电池：${item.battery || '—'}
- 重量：${item.weight || '—'}
- 尺寸：${item.dimensions || '—'}
- 价格：${item.price} 元（活动到手价）
- 来源：${item.source_note}`;
}

// 匹配每个型号段落：### 开头，可能带编号，到下一个 ### 之前
const sectionRegex = /###\s+(?:\d+\.\s*)?([^\n]+)\n([\s\S]*?)(?=\n###\s+(?:\d+\.\s*)?[^\n]+\n|$)/g;
let match;
let replaced = 0;
let matched = 0;
let skipped = [];

while ((match = sectionRegex.exec(md)) !== null) {
  const sectionName = match[1].trim();
  const sectionBody = match[2];

  if (!sectionBody.includes('**官方参数**')) continue;

  const item = findItemByName(sectionName);
  if (!item) {
    skipped.push(sectionName);
    continue;
  }
  matched++;

  const specStart = sectionBody.indexOf('**官方参数**');
  if (specStart < 0) continue;

  let specEnd = sectionBody.length;
  const nextSectionIdx = sectionBody.indexOf('\n###', specStart);
  if (nextSectionIdx > 0) specEnd = nextSectionIdx;

  const oldSpecBlock = sectionBody.slice(specStart, specEnd).trim();
  const newSpecBlock = buildSpecBlock(item);

  if (oldSpecBlock !== newSpecBlock) {
    const newSectionBody = sectionBody.slice(0, specStart) + newSpecBlock + sectionBody.slice(specEnd);
    md = md.replace(match[0], `### ${match[1]}\n${newSectionBody}`);
    replaced++;
  }
}

fs.writeFileSync(mdPath, md, 'utf8');
console.log('matched:', matched);
console.log('replaced:', replaced);
console.log('skipped:', skipped);
