const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'decision-ipad-size.html'));
  await new Promise(r => setTimeout(r, 800));
  const el = await page.$('body');
  const box = await el.boundingBox();
  await page.screenshot({
    path: path.resolve(__dirname, '..', 'iPad尺寸决策卡-11vs13.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: Math.ceil(box.height) }
  });
  console.log('saved: iPad尺寸决策卡-11vs13.png');
  await browser.close();
})();
