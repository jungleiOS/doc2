const puppeteer = require('puppeteer-core');
const path = require('path');

const jobs = [
  { html: 'table-main.html', out: '苹果返校季2026-抵扣方案表.png' },
  { html: 'table-info.html', out: '苹果返校季2026-资格与机型.png' }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1192, height: 1600, deviceScaleFactor: 2 }
  });

  for (const job of jobs) {
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, job.html);
    const outputPath = path.resolve(__dirname, '..', job.out);
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const clip = await page.evaluate(() => {
      const el = document.body;
      const rect = el.getBoundingClientRect();
      const card = document.querySelector('.card').getBoundingClientRect();
      return { x: 0, y: 0, width: rect.width, height: card.bottom + 56 };
    });
    await page.screenshot({ path: outputPath, type: 'png', clip });
    console.log('Screenshot saved:', outputPath);
    await page.close();
  }

  await browser.close();
})();
