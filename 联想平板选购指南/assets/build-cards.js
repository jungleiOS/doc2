const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'table-data.json'), 'utf8'));

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\/\s·]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderCard(item) {
  const imgHtml = item.official_image_url
    ? `<img src="${escapeHtml(item.official_image_url)}" alt="${escapeHtml(item.name)}">`
    : `<div class="img-placeholder">暂无官方图</div>`;

  const specRows = [
    { label: '处理器', value: item.processor },
    { label: '屏幕', value: item.screen },
    { label: '内存 / 存储', value: item.ram_storage },
    { label: '电池', value: item.battery },
    { label: '重量', value: item.weight },
    { label: '尺寸', value: item.dimensions }
  ];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(item.name)} 参数卡</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: #f5f6f7;
      padding: 40px;
      color: #1a1a1a;
    }
    .container { max-width: 720px; margin: 0 auto; }
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
    }
    .name { font-size: 24px; font-weight: 700; line-height: 1.3; }
    .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
    .price {
      font-size: 28px;
      font-weight: 700;
      color: #e02e24;
      white-space: nowrap;
    }
    .main {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    .img-wrap {
      width: 180px;
      flex-shrink: 0;
      text-align: center;
    }
    .img-wrap img {
      width: 160px;
      height: 160px;
      object-fit: contain;
      background: #f8f8f8;
      border-radius: 12px;
    }
    .img-placeholder {
      width: 160px;
      height: 160px;
      margin: 0 auto;
      background: #f0f0f0;
      color: #999;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      line-height: 1.4;
    }
    .specs {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
      font-size: 14px;
    }
    .spec-item {
      background: #f8f8f8;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .spec-item .label {
      color: #888;
      font-size: 12px;
      display: block;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div>
          <div class="name">${escapeHtml(item.name)}</div>
          ${item.subtitle ? `<div class="subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
        </div>
        <div class="price">¥${escapeHtml(item.price)}</div>
      </div>
      <div class="main">
        <div class="img-wrap">
          ${imgHtml}
        </div>
        <div class="specs">
          ${specRows.map(r => `<div class="spec-item"><span class="label">${escapeHtml(r.label)}</span>${escapeHtml(r.value || '—')}</div>`).join('\n          ')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const pages = [
  { key: 'entry_series', prefix: 'entry' },
  { key: 'performance_series', prefix: 'performance' },
  { key: 'premium_series', prefix: 'premium' }
];

for (const page of pages) {
  const items = data[page.key];
  for (const item of items) {
    const html = renderCard(item);
    const filename = `card-${page.prefix}-${slugify(item.name)}.html`;
    fs.writeFileSync(path.join(__dirname, filename), html, 'utf8');
    console.log('written:', filename);
  }
}
