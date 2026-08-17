const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1500, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8766/cover-assets/decision-flow.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  const el = await page.$('#flow');
  await el.screenshot({ path: '多口充电器选购指南-决策图.png' });
  await browser.close();
  console.log('done');
})();
