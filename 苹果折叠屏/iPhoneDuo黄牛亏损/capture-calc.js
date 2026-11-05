const puppeteer = require('puppeteer-core');
const path = require('path');

const DIR = __dirname;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1000, height: 900, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(DIR, 'calc-loss.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 500));
  const el = await page.$('#shot');
  await el.screenshot({ path: path.resolve(DIR, '配图-亏13万算账推演示意.png'), type: 'png' });
  console.log('✓ 配图-亏13万算账推演示意.png');
  await browser.close();
})();
