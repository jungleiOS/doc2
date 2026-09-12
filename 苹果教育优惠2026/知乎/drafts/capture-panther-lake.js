const puppeteer = require('puppeteer-core');
const path = require('path');

const pages = [
  { html: 'cover-panther-lake-cost.html', out: 'panther-lake-成本对比.png' },
  { html: 'cover-panther-lake-compare.html', out: 'panther-lake-四维度对比.png' },
  { html: 'cover-panther-lake-recommend.html', out: 'panther-lake-场景推荐.png' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const dir = __dirname;

  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 800, deviceScaleFactor: 2 });
    const url = 'file://' + path.join(dir, p.html);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const body = await page.$('body');
    const box = await body.boundingBox();
    
    await page.screenshot({
      path: path.join(dir, p.out),
      clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) },
      type: 'png',
    });
    
    console.log('✓ ' + p.out);
    await page.close();
  }

  await browser.close();
  console.log('Done!');
})();
