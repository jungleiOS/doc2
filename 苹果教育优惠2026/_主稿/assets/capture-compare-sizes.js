const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1192, height: 1800, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'compare-ipad-sizes.html');
  const outputPath = path.resolve(__dirname, '..', '知乎', 'iPad三尺寸实拍对比图.png');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
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
