// 百家号 iPhone 18 Pro 配图统一截图脚本
// 用法：cd drafts/bjh-assets-iphone18pro && node capture-all.js
// 产出：drafts/images-iphone18pro-bjh/ 下 5 张 PNG（@2x Retina 2400px 宽）

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const HERE = __dirname;
const OUT_DIR = path.resolve(HERE, '../images-iphone18pro-bjh');

const TASKS = [
  { html: 'table-pricing.html',   png: 'table-pricing.png',      w: 1200 },
  { html: 'table-compare.html',   png: 'table-compare.png',      w: 1200 },
  { html: 'chart-charging.html',  png: 'chart-charging.png',     w: 1200 },
  { html: 'card-a20pro.html',     png: 'card-a20pro.png',        w: 1200 },
  { html: 'table-upgrade.html',   png: 'table-upgrade.png',      w: 1200 },
];

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.error('Chrome not found at:', CHROME);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--hide-scrollbars',
      '--font-render-hinting=none',
    ],
  });

  for (const t of TASKS) {
    const htmlPath = path.join(HERE, t.html);
    const outPath  = path.join(OUT_DIR, t.png);

    // 每个任务独立 newPage（复用同一 page 连续 goto 会抛 "Navigating frame was detached"）
    const page = await browser.newPage();
    await page.setViewport({ width: t.w, height: 800, deviceScaleFactor: 2 });

    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });
    // 让字体 / 渐变稳定
    await new Promise(r => setTimeout(r, 800));

    // 找到 #shot 元素并裁切到它，去掉 body padding 之外的空白
    const clip = await page.evaluate(() => {
      const el = document.getElementById('shot');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // 包含 body padding（40px），向外扩一点保留呼吸感
      return {
        x: Math.max(0, rect.x - 20),
        y: Math.max(0, rect.y - 20),
        width:  rect.width  + 40,
        height: rect.height + 40,
      };
    });

    if (!clip) {
      console.warn(`[skip] ${t.html} — no #shot element`);
      await page.close();
      continue;
    }

    await page.screenshot({
      path: outPath,
      type: 'png',
      clip,
      omitBackground: false,
    });

    console.log(`[ok]   ${t.png}  (${Math.round(clip.width * 2)}×${Math.round(clip.height * 2)} @2x)`);
    await page.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to:\n  ${OUT_DIR}`);
})();
