// 百家号版 iPad Pro 涨价配图截图（与知乎版视觉区隔：深色底）
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1200, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'bjh-price-chart.html'));
  await new Promise(r => setTimeout(r, 500));
  const el = await page.$('#shot');
  await el.screenshot({ path: path.resolve(__dirname, '百家号-iPadPro涨价-价格柱状图.png') });
  await browser.close();
  console.log('done');
})();
