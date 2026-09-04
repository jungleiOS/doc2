// 确定性逐帧渲染：暂停所有 CSS 动画，按 t = i/15 步进 currentTime 截帧
// 用法: node capture-webp.js <page>   例: node capture-webp.js tail-zhihu-anim
// 输出: /tmp/<page>-frames/f_000.png ... f_089.png（90 帧，15fps，6s 循环，不含 t=6.0 末帧）
// file:// 直读本地 HTML，无需起服务
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const page = process.argv[2];
if (!page) { console.error('usage: node capture-webp.js <page>'); process.exit(1); }

const FPS = 15, FRAMES = 90;
const outDir = `/tmp/${page}-frames`;
const pageUrl = 'file://' + path.resolve(__dirname, `${page}.html`);

(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1320, height: 620, deviceScaleFactor: 2 });
  await pg.goto(pageUrl, { waitUntil: 'networkidle0' });
  await pg.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  // 暂停全部动画，进入确定性步进模式
  await pg.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
  const el = await pg.$('#tail');
  for (let i = 0; i < FRAMES; i++) {
    await pg.evaluate((t) => {
      document.getAnimations().forEach(a => { a.currentTime = t; });
    }, i * 1000 / FPS);
    await el.screenshot({ path: `${outDir}/f_${String(i).padStart(3, '0')}.png` });
  }
  await browser.close();
  console.log(`done: ${FRAMES} frames -> ${outDir}`);
})();
