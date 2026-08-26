const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: {
      width: 690,
      height: 280,
      deviceScaleFactor: 3
    }
  });

  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'cover-main.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const outputPath = path.resolve(__dirname, '..', '联想平板选购指南-封面.png');
  await page.screenshot({ path: outputPath });
  console.log('saved:', outputPath);

  await browser.close();
})();
