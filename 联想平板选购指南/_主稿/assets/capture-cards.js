const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: {
      width: 800,
      height: 600,
      deviceScaleFactor: 2
    }
  });

  const files = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('card-') && f.endsWith('.html'))
    .sort();

  for (const htmlFile of files) {
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, htmlFile);
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
          setTimeout(resolve, 3000);
        });
      }));
    });

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 800, height: bodyHeight + 80, deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 300));

    const pngFile = htmlFile.replace(/\.html$/, '.png');
    const outputPath = path.resolve(__dirname, pngFile);
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log('saved:', pngFile, 'height:', bodyHeight);
    await page.close();
  }

  await browser.close();
})();
