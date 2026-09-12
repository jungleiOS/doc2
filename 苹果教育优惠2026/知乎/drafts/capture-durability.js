const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const files = [
    { html: 'cost-comparison.html', out: '苹果笔记本耐用性-使用成本对比.png' },
    { html: 'durability-layers.html', out: '苹果笔记本耐用性-三层逻辑.png' }
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
