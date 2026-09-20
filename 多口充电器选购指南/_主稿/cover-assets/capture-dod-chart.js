const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 700, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8766/cover-assets/dod-cycle-chart.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const el = await page.$('body');
  await el.screenshot({ path: 'cover-assets/放电深度与循环寿命.png' });
  await browser.close();
  console.log('done');
})();
