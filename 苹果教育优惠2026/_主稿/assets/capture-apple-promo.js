const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--lang=zh-CN'],
    defaultViewport: { width: 1440, height: 1100, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  );

  await page.goto('https://www.apple.com.cn/cn-edu/store', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // 查找包含返校季促销文案的区块
  const found = await page.evaluate(() => {
    const keywords = ['AirTag 四件装', '限时特惠', '返校'];
    const all = Array.from(document.querySelectorAll('section, div'));
    for (const kw of keywords) {
      // 找最深层的匹配元素（文本直接包含关键字的容器）
      const match = all
        .filter(el => el.textContent.includes(kw))
        .sort((a, b) => a.textContent.length - b.textContent.length)[0];
      if (match) {
        match.scrollIntoView({ block: 'center' });
        return { keyword: kw, text: match.textContent.slice(0, 120) };
      }
    }
    return null;
  });
  console.log('promo section:', JSON.stringify(found));
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.resolve(__dirname, '..', '知乎', '苹果官网-返校季促销区块.png'),
    type: 'png',
    fullPage: false
  });
  console.log('promo screenshot saved');

  // 再截一屏产品选购区（教育价）
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, h2, h3'));
    const m = links.find(el => /选购 Mac|Mac.*教育|购买 Mac/i.test(el.textContent));
    if (m) m.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, 2400);
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.resolve(__dirname, '..', '知乎', '苹果官网-教育商店产品区.png'),
    type: 'png',
    fullPage: false
  });
  console.log('products screenshot saved');

  await browser.close();
})();
