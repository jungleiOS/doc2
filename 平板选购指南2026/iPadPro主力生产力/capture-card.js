const puppeteer = require('puppeteer-core');
const path = require('path');

// iPad Pro 分流卡截图脚本
// 用法：node capture-card.js
// 输出：decision-card-bjh.png（deviceScaleFactor 2，CSS 尺寸 ×2）

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'decision-card.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 400));

  const el = await page.$('#shot');
  await el.screenshot({ path: path.resolve(__dirname, 'decision-card-bjh.png'), type: 'png' });
  await browser.close();
  console.log('OK: decision-card-bjh.png');
})();
