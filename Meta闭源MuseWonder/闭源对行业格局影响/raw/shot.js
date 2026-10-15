// 整页/首屏截图: node shot.js <url> <out.png> [full]
const puppeteer = require('puppeteer-core');

(async () => {
  const [url, out, mode] = process.argv.slice(2);
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  try {
    await pg.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    await new Promise(r => setTimeout(r, 4000));
  }
  await pg.evaluate(() => document.fonts.ready).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await pg.screenshot({ path: out, fullPage: mode === 'full' });
  await browser.close();
  console.log('saved', out);
})().catch(e => { console.error(e.message); process.exit(1); });
