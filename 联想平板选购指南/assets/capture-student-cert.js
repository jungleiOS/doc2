const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: {
      width: 840,
      height: 600,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'student-cert.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 840, height: bodyHeight + 80, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 300));

  const outputPath = path.resolve(__dirname, 'student-cert.png');
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log('saved:', outputPath, 'height:', bodyHeight);

  await browser.close();
})();
