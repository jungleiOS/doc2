const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1192, height: 1600, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'compare-m4-m5.html');
  const outputPath = path.resolve(__dirname, '..', '知乎', 'MacBook-Air-M4vsM5-差异对照卡.png');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const clip = await page.evaluate(() => {
    const el = document.body;
    const rect = el.getBoundingClientRect();
    const card = document.querySelector('.card').getBoundingClientRect();
    return { x: 0, y: 0, width: rect.width, height: card.bottom + 56 };
  });
  await page.screenshot({ path: outputPath, type: 'png', clip });
  console.log('Screenshot saved:', outputPath);
  await page.close();

  await browser.close();
})();
