const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const files = [
    { html: 'cover-air-vs-pro-decision.html', out: 'MacBook-Air-vs-Pro-专业决策表.png' },
    { html: 'cover-air-vs-pro-compare.html', out: 'MacBook-Air-vs-Pro-四维度对比.png' }
  ];

  for (const f of files) {
    const page = await browser.newPage();
    const filePath = path.join(__dirname, f.html);
    await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: path.join(__dirname, f.out),
      type: 'png',
      clip: { x: 0, y: 0, width: 900, height: await page.evaluate(() => document.body.scrollHeight) }
    });
    await page.close();
    console.log('Saved:', f.out);
  }

  await browser.close();
})();
