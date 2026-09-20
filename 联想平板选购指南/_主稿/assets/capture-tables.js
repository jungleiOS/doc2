const puppeteer = require('puppeteer-core');
const path = require('path');

const tables = [
  { html: 'table-entry.html', png: 'table-entry.png' },
  { html: 'table-performance.html', png: 'table-performance.png' },
  { html: 'table-premium.html', png: 'table-premium.png' }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: {
      width: 1500,
      height: 1200,
      deviceScaleFactor: 2
    }
  });

  for (const item of tables) {
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, item.html);
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // 等待所有图片加载
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
          setTimeout(resolve, 3000);
        });
      }));
    });

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1500, height: bodyHeight + 80, deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 500));

    const outputPath = path.resolve(__dirname, item.png);
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log('saved:', outputPath, 'height:', bodyHeight);
    await page.close();
  }

  await browser.close();
})();
