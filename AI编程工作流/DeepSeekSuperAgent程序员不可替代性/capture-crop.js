const puppeteer = require('puppeteer-core');
const path = require('path');

// 裁剪重截：IT之家报道页 + 新浪报道页（去掉顶部大促横幅广告）
// 只截正文标题区，clip 从文章标题上方开始

(async () => {
  const dir = __dirname;
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  // IT之家：正文标题约从 CSS y=300 开始，裁掉顶部导航+双11横幅
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('https://www.ithome.com/1/020/615.htm', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(dir, '图2-IT之家报道截图.png'), type: 'png', clip: { x: 0, y: 375, width: 1090, height: 525 } });
    await page.close();
    console.log('OK: 图2');
  }

  // 新浪：正文标题约从 CSS y=270 开始，裁掉顶部 App 横幅
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('https://finance.sina.com.cn/tech/csj/2026-11-01/doc-inixepty4335109.shtml', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(dir, '图3-新浪报道截图.png'), type: 'png', clip: { x: 0, y: 265, width: 1440, height: 635 } });
    await page.close();
    console.log('OK: 图3');
  }

  await browser.close();
})();
