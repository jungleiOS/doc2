const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 900, height: 600, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'cover-bjh-fold.html'), {
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.resolve(__dirname, '百家号版-苹果折叠屏-封面.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 900, height: 600 }
  });
  console.log('saved: 百家号版-苹果折叠屏-封面.png');
  await browser.close();
})();
