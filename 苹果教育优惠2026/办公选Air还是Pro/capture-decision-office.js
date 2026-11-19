const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('file://' + __dirname + '/decision-office-tiers.html', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: __dirname + '/办公负载三档决策表.png',
    fullPage: true,
  });
  await browser.close();
  console.log('done');
})();
