// PPI 对比示意图截图：file:// 直读 + deviceScaleFactor 2 + #shot 元素截图
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1100, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'ppi-compare.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 400));
  const el = await page.$('#shot');
  await el.screenshot({ path: path.resolve(__dirname, 'PPI与观看距离对比-自制示意.png'), type: 'png' });
  await browser.close();
  console.log('OK: PPI与观看距离对比-自制示意.png');
})();
