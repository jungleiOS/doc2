const puppeteer = require('puppeteer-core');
const path = require('path');

const DIR = __dirname;
const OUT = path.resolve(__dirname);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 1200, height: 1000, deviceScaleFactor: 2 }
  });

  // === 已有 3 张（对比表 + 速查卡 + 封面）===
  const existingJobs = [
    { html: 'table-compare.html', png: '百家号版-iPhoneDuo-三款折叠屏对比.png', mode: 'card' },
    { html: 'table-specs.html', png: '百家号版-iPhoneDuo-参数速查卡.png', mode: 'receipt' },
    { html: 'cover.html', png: '百家号版-iPhoneDuo折叠屏-封面.png', mode: 'fixed', w: 900, h: 500 },
  ];

  // === 4 张重制 ===
  const remakeJobs = [
    { html: 'remake-front.html', png: '百家号版-iPhoneDuo-正面屏下摄像头.png' },
    { html: 'remake-camera.html', png: '百家号版-iPhoneDuo-48MP双摄无长焦.png' },
    { html: 'remake-thin.html', png: '百家号版-iPhoneDuo-5.2mm厚度.png' },
    { html: 'remake-ios.html', png: '百家号版-iPhoneDuo-iOS27三种形态.png' },
  ];

  // === 3 张新图 ===
  const newJobs = [
    { html: 'new-thickness.html', png: '百家号版-iPhoneDuo-厚度对决卡.png', mode: 'card' },
    { html: 'new-decision.html', png: '百家号版-iPhoneDuo-选购分流卡.png', mode: 'card' },
    { html: 'new-timeline.html', png: '百家号版-iPhoneDuo-折叠屏进化时间线.png', mode: 'card' },
  ];

  // 1. 已有截图
  for (const job of existingJobs) {
    const page = await browser.newPage();
    if (job.mode === 'fixed') {
      await page.setViewport({ width: job.w, height: job.h, deviceScaleFactor: 2 });
      await page.goto('file://' + path.resolve(DIR, job.html), { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.resolve(OUT, job.png), type: 'png', clip: { x: 0, y: 0, width: job.w, height: job.h } });
    } else if (job.mode === 'receipt') {
      await page.goto('file://' + path.resolve(DIR, job.html), { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(r => setTimeout(r, 500));
      const clip = await page.evaluate(() => {
        const rect = document.body.getBoundingClientRect();
        const card = document.querySelector('.receipt').getBoundingClientRect();
        return { x: 0, y: 0, width: rect.width, height: card.bottom + 56 };
      });
      await page.screenshot({ path: path.resolve(OUT, job.png), type: 'png', clip });
    } else {
      await page.goto('file://' + path.resolve(DIR, job.html), { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(r => setTimeout(r, 500));
      const clip = await page.evaluate(() => {
        const card = document.querySelector('.card').getBoundingClientRect();
        return { x: 0, y: 0, width: card.width, height: card.bottom + 56 };
      });
      await page.screenshot({ path: path.resolve(OUT, job.png), type: 'png', clip });
    }
    console.log('✓', job.png);
    await page.close();
  }

  // 2. 4 张重制（截 #shot 整块）
  for (const job of remakeJobs) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(DIR, job.html), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 800));
    const el = await page.$('#shot');
    await el.screenshot({ path: path.resolve(OUT, job.png), type: 'png' });
    console.log('✓', job.png);
    await page.close();
  }

  // 3. 3 张新图（截 .card 整块）
  for (const job of newJobs) {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(DIR, job.html), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 500));
    const clip = await page.evaluate(() => {
      const card = document.querySelector('.card').getBoundingClientRect();
      return { x: 0, y: 0, width: card.width, height: card.bottom + 56 };
    });
    await page.screenshot({ path: path.resolve(OUT, job.png), type: 'png', clip });
    console.log('✓', job.png);
    await page.close();
  }

  await browser.close();
  console.log('\n全部 10 张截图完成，输出目录：', OUT);
})();
