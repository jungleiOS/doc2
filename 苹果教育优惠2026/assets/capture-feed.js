const puppeteer = require('puppeteer-core');
const path = require('path');

// 喂饭图截图：官网路线 + 京东路线
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1200, height: 1000, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();

  const jobs = [
    ['feed-official.html', '苹果返校季2026-官网路线喂饭图.png'],
    ['feed-jd.html', '苹果返校季2026-京东国补喂饭图.png'],
  ];

  for (const [html, png] of jobs) {
    await page.goto('file://' + path.resolve(__dirname, html), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 800));
    const card = await page.$('.card');
    await card.screenshot({ path: path.resolve(__dirname, '..', png) });
    console.log('saved:', png);
  }
  await browser.close();
})();
