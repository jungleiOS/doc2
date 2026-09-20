const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1430, height: 610, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8766/cover-assets/cover-protocol.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  const el = await page.$('#cover');
  await el.screenshot({ path: '知乎文章-充电协议篇-封面.png' });
  await browser.close();
  console.log('done');
})();
