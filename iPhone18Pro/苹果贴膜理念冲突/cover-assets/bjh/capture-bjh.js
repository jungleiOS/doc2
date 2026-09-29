const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });

  const jobs = [
    { url: 'http://127.0.0.1:8791/cover-assets/bjh/cost-compare.html', sel: '#chart', out: 'cover-assets/bjh/bjh-cost-compare.jpg' },
    { url: 'http://127.0.0.1:8791/cover-assets/bjh/persona-split.html', sel: '#card', out: 'cover-assets/bjh/bjh-persona-split.jpg' },
  ];

  for (const j of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1600, deviceScaleFactor: 2 });
    await page.goto(j.url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 600));
    const el = await page.$(j.sel);
    await el.screenshot({ path: j.out, type: 'jpeg', quality: 88 });
    await page.close();
    console.log('captured', j.out);
  }

  await browser.close();
})();
