const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

// Chrome 单张截图高度上限 16384px，长图需按块分段截取再用 PIL 拼接
(async () => {
  const dir = __dirname;
  const htmlPath = path.resolve(dir, 'consult-reply.html');
  const outputPath = path.resolve(dir, '美版有锁iPhone17咨询-答复长图.png');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 750, height: 1200, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  // 按 body 直接子元素的边界分段，避免切断文字行
  const { blocks, total } = await page.evaluate(() => {
    const els = [...document.body.children];
    const blocks = els.map(el => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
    });
    return { blocks, total: Math.round(document.documentElement.scrollHeight) };
  });

  const MAX_SEG = 7000; // CSS px，@2x 后 14000px，低于 16384 上限
  const segments = [];
  let cur = 0;
  for (const b of blocks) {
    if (b.bottom - cur > MAX_SEG && b.top > cur) {
      segments.push({ start: cur, end: b.top });
      cur = b.top;
    }
  }
  segments.push({ start: cur, end: total });

  const parts = [];
  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    const part = path.resolve(dir, `_seg-${i}.png`);
    await page.screenshot({
      path: part,
      clip: { x: 0, y: start, width: 750, height: end - start }
    });
    parts.push(part);
    console.log(`seg ${i}: y=${start} h=${end - start}`);
  }
  await browser.close();

  fs.writeFileSync(path.resolve(dir, '_segments.json'), JSON.stringify({ parts, outputPath }));
  console.log('segments done:', parts.length);
})();
