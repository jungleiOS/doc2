// 截图：旧iPhone出手时间线决策卡（百家号版配图）
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const dir = __dirname;
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(dir, 'timeline-card.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));
  const el = await page.$('#card');
  await el.screenshot({ path: path.join(dir, '..', 'bjh-timeline-card.png') });
  await browser.close();
  console.log('done: bjh-timeline-card.png');
})();
