const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('file://' + __dirname + '/decision-air15-vs-pro14.html', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: __dirname + '/MacBook-Air15-vs-Pro14-决策表.png',
    fullPage: true,
  });
  await browser.close();
  console.log('Screenshot saved: MacBook-Air15-vs-Pro14-决策表.png');
})();
