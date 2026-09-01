const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--lang=zh-CN'],
    defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  );

  const targets = [
    {
      url: 'https://www.apple.com.cn/cn-edu/store',
      out: '苹果官网-教育商店首页.png',
      scrolls: [0, 950]
    },
    {
      url: 'https://www.apple.com.cn/cn-edu/shop/back-to-school',
      out: '苹果官网-返校季活动页.png',
      scrolls: [0, 950]
    }
  ];

  for (const t of targets) {
    try {
      const resp = await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 60000 });
      const status = resp ? resp.status() : 'no-response';
      console.log(t.url, '->', status, '| final url:', page.url());
      await new Promise(r => setTimeout(r, 3000));

      // 关闭可能出现的 cookie 提示
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const ok = btns.find(b => /接受|同意|继续|OK/i.test(b.textContent || ''));
        if (ok) ok.click();
      });
      await new Promise(r => setTimeout(r, 800));

      for (let i = 0; i < t.scrolls.length; i++) {
        await page.evaluate(y => window.scrollTo(0, y), t.scrolls[i]);
        await new Promise(r => setTimeout(r, 1500));
        const suffix = t.scrolls.length > 1 ? `-${i + 1}` : '';
        const outputPath = path.resolve(__dirname, '..', '知乎', t.out.replace('.png', `${suffix}.png`));
        await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
        console.log('Screenshot saved:', outputPath);
      }
    } catch (e) {
      console.log('FAILED:', t.url, e.message);
    }
  }

  await browser.close();
})();
