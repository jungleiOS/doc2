const puppeteer = require('puppeteer-core');
const path = require('path');

// 百家号版配图截图：小票风表格 + 喂饭图 + 信息流封面
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1200, height: 1000, deviceScaleFactor: 2 }
  });
  // 1-2. 小票风表格（clip 裁掉 body 留白）
  const tableJobs = [
    ['table-main-bjh.html', '百家号版-苹果返校季2026-抵扣方案表.png'],
    ['table-info-bjh.html', '百家号版-苹果返校季2026-资格与机型.png'],
    ['table-price-bjh.html', '百家号版-苹果返校季2026-到手价对账.png'],
  ];
  for (const [html, png] of tableJobs) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, html), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 500));
    const clip = await page.evaluate(() => {
      const rect = document.body.getBoundingClientRect();
      const card = document.querySelector('.receipt').getBoundingClientRect();
      return { x: 0, y: 0, width: rect.width, height: card.bottom + 56 };
    });
    await page.screenshot({ path: path.resolve(__dirname, '..', '百家号', png), type: 'png', clip });
    console.log('saved:', png);
    await page.close();
  }

  // 3-4. 喂饭图（截 .sheet 整块）
  const feedJobs = [
    ['feed-official-bjh.html', '百家号版-苹果返校季2026-官网路线喂饭图.png'],
    ['feed-jd-bjh.html', '百家号版-苹果返校季2026-京东国补喂饭图.png'],
  ];
  for (const [html, png] of feedJobs) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, html), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 800));
    const sheet = await page.$('.sheet');
    await sheet.screenshot({ path: path.resolve(__dirname, '..', '百家号', png) });
    console.log('saved:', png);
    await page.close();
  }

  // 5. 信息流封面 900×600（整页固定尺寸）
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'cover-bjh.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.resolve(__dirname, '..', '百家号', '百家号版-苹果返校季2026-封面.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 900, height: 600 }
  });
  console.log('saved: 百家号版-苹果返校季2026-封面.png');

  await browser.close();
})();
