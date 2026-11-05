const puppeteer = require('puppeteer-core');
const path = require('path');

// 配图截图脚本：IT之家报道页 + 新浪财经报道页 + 自制注意力账本示意图

(async () => {
  const dir = __dirname;
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  // IT之家报道页
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
    await page.goto('https://www.ithome.com/1/020/615.htm', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(dir, '图2-IT之家报道截图.png'), type: 'png' });
    await page.close();
    console.log('OK: 图2');
  }

  // 新浪财经报道页
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
    await page.goto('https://finance.sina.com.cn/tech/csj/2026-11-01/doc-inixepty4335109.shtml', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(dir, '图3-新浪报道截图.png'), type: 'png' });
    await page.close();
    console.log('OK: 图3');
  }

  // 自制注意力账本示意图
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(dir, '注意力账本示意.html'), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const el = await page.$('#shot');
    await el.screenshot({ path: path.join(dir, '图4-注意力账本示意.png'), type: 'png' });
    await page.close();
    console.log('OK: 图4');
  }

  await browser.close();
})();
