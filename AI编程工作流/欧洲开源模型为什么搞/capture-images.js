const puppeteer = require('puppeteer-core');
const path = require('path');

const dir = __dirname;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function shotUrl(browser, url, outfile, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: opts.w || 1280, height: opts.h || 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, opts.wait || 4500));
  // dismiss common cookie banners
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button, a')];
    const hit = buttons.find((b) => /accept all|accept|同意全部|同意|允许全部|i agree/i.test((b.innerText || '').trim()));
    if (hit) hit.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  if (opts.scrollY) await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, outfile), type: 'png' });
  const title = await page.title();
  console.log('OK', outfile, title);
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--lang=zh-CN'],
  });

  // 1) BNP official press release
  await shotUrl(
    browser,
    'https://group.bnpparibas/en/press-release/bnp-paribas-and-mistral-ai-extend-their-partnership',
    'img2-bnp-mistral.png',
    { wait: 5000, h: 1000 }
  );

  // 2) D-round Chinese coverage
  await shotUrl(
    browser,
    'https://www.21ic.com/a/1011425.html',
    'img4-mistral-dround-21ic.png',
    { wait: 5000, h: 1100, scrollY: 200 }
  );

  // 3) French MoD framework — Generation Digital summary citing Reuters
  await shotUrl(
    browser,
    'https://www.gend.co/blog/mistral-ai-french-defence-framework',
    'img1-french-mod-gend.png',
    { wait: 5000, h: 1000 }
  );

  // 4) Airbus/BMW manufacturing partnership Chinese coverage
  await shotUrl(
    browser,
    'https://www.aibase.com/news/28436',
    'img3-airbus-bmw-aibase.png',
    { wait: 5000, h: 1000 }
  );

  // 5) schematic
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 720, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(dir, '三约束示意.html'), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 400));
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1200, height: Math.min(h + 40, 900), deviceScaleFactor: 2 });
    await page.screenshot({ path: path.join(dir, '图-三约束示意.png'), type: 'png', fullPage: true });
    console.log('OK 图-三约束示意.png');
    await page.close();
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
