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

function renderCard(item) {
  const imgHtml = item.official_image_url
    ? `<img src="${escapeHtml(item.official_image_url)}" alt="${escapeHtml(item.name)}">`
    : `<div class="img-placeholder">暂无官方图</div>`;

  return `
    <div class="card">
      <div class="img-wrap">
        ${imgHtml}
        <div class="price-tag">¥${escapeHtml(item.price)}</div>
      </div>
      <div class="content">
        <div class="name">${escapeHtml(item.name)}${item.subtitle ? '（' + escapeHtml(item.subtitle) + '）' : ''}</div>
        <div class="specs">
          <span><span class="label">处理器</span> ${escapeHtml(item.processor || '—')}</span>
          <span><span class="label">屏幕</span> ${escapeHtml(item.screen || '—')}</span>
          <span><span class="label">内存/存储</span> ${escapeHtml(item.ram_storage || '—')}</span>
          <span><span class="label">电池</span> ${escapeHtml(item.battery || '—')}</span>
          <span><span class="label">重量</span> ${escapeHtml(item.weight || '—')}</span>
          <span><span class="label">尺寸</span> ${escapeHtml(item.dimensions || '—')}</span>
        </div>
      </div>
    </div>
  `.trim();
}

function renderPage(title, subtitle, note, items) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: #f5f6f7;
      padding: 40px;
      color: #1a1a1a;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
    .note {
      font-size: 12px;
      color: #888;
      margin-bottom: 24px;
      padding: 12px 16px;
      background: #fff;
      border-left: 3px solid #e02e24;
      border-radius: 0 8px 8px 0;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      display: flex;
      gap: 18px;
    }
    .img-wrap {
      width: 140px;
      flex-shrink: 0;
      text-align: center;
    }
    .img-wrap img {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 12px;
      background: #f8f8f8;
    }
    .img-placeholder {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      border-radius: 12px;
      background: #f0f0f0;
      color: #999;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.4;
    }
    .price-tag {
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #e02e24;
    }
    .content { flex: 1; }
    .name {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .specs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 12px;
      font-size: 13px;
    }
    .specs span {
      color: #444;
      line-height: 1.5;
    }
    .specs .label { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <div class="note">${escapeHtml(note)}</div>
    <div class="grid">
${items.map(renderCard).join('\n')}
    </div>
  </div>
</body>
</html>`;
}

const pages = [
  {
    key: 'entry_series',
    file: 'table-entry.html',
    title: '联想平板 · 入门学习系列对比',
    subtitle: '价格区间 748–999 元，适合网课、追剧、轻度使用',
    note: '注：价格取京东联盟 8.25–8.28 活动到手价，实际以结算页为准。参数优先来自联想官方商城配置信息页；官网未完整标注的重量/尺寸等项由京东详情页或可靠媒体补充。产品图优先使用联想官方素材，官网未提供官方图的型号留白。'
  },
  {
    key: 'performance_series',
    file: 'table-performance.html',
    title: '联想平板 · 性能游戏系列对比',
    subtitle: '价格区间 1649–4599 元，覆盖影音、学习和游戏',
    note: '注：价格取京东联盟 8.25–8.28 活动到手价，实际以结算页为准。参数优先来自联想官方商城配置信息页；官网未完整标注的重量/尺寸等项由京东详情页或可靠媒体补充。拯救者 Y700 三代官网未找到完整配置页，参数来自 IT之家/京东详情页。产品图优先使用联想官方素材。'
  },
  {
    key: 'premium_series',
    file: 'table-premium.html',
    title: '联想平板 · 高端创作 / 二合一系列对比',
    subtitle: '价格区间 2799–5999 元，覆盖创作办公和 Windows 生态',
    note: '注：价格取京东联盟 8.25–8.28 活动到手价，实际以结算页为准。参数优先来自联想官方商城配置信息页；YOGA Pad Pro 14.5 部分参数官网未完整公开，异能者 J140/S120A 为 Windows 二合一设备且官网未找到完整配置页，参数来自京东详情页。产品图优先使用联想官方素材，官网未提供官方图的型号留白。'
  }
];

for (const page of pages) {
  const html = renderPage(page.title, page.subtitle, page.note, data[page.key]);
  fs.writeFileSync(path.join(__dirname, page.file), html, 'utf8');
  console.log('written:', page.file, 'items:', data[page.key].length);
}
