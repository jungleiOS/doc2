const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1500, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8777/cover-assets/3c-check-flow.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  const el = await page.$('#flow');
  await el.screenshot({ path: '充电宝3C新规选购指南-3C自查流程图.png' });
  await browser.close();
  console.log('done');
})();
