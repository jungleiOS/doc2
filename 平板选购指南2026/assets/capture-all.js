const puppeteer = require('puppeteer-core');
const path = require('path');

// 平板选购指南2026 · 全套配图截图脚本
// 用法：node capture-all.js [只截某张的 html 名，如 cover]
// 输出：../平板选购指南2026-<图名>.png（deviceScaleFactor 2，CSS 尺寸 ×2）

const jobs = [
  { html: 'cover.html',            out: '平板选购指南2026-封面.png' },
  { html: 'decision.html',         out: '平板选购指南2026-决策图.png' },
  { html: 'sim-list.html',         out: '平板选购指南2026-插卡清单.png' },
  { html: 'accessory-tax.html',    out: '平板选购指南2026-配件税.png' },
  { html: 'price-timeline.html',   out: '平板选购指南2026-涨价时间线.png' },
  { html: 'benchmark-tiers.html',  out: '平板选购指南2026-跑分梯队.png' },
  { html: 'eye-care.html',         out: '平板选购指南2026-护眼对照.png' },
  { html: 'students.html',         out: '平板选购指南2026-大学生对比.png' },
  { html: 'kids-control.html',     out: '平板选购指南2026-宝妈管控.png' },
  { html: 'parents.html',          out: '平板选购指南2026-父母追剧.png' },
  { html: 'small-screen.html',     out: '平板选购指南2026-小屏组.png' },
  { html: 'cheat-sheet.html',      out: '平板选购指南2026-速查表.png' },
  { html: 'cover-sim.html',        out: '知乎文章-平板插卡篇-封面.png' },
  { html: 'ipad-pro-price.html',   out: 'assets/raw/ipad-pro-price/iPadPro11寸历代起售价-自制.png' },
];

const filter = process.argv[2];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  for (const job of jobs) {
    if (filter && !job.html.startsWith(filter)) continue;

    const htmlPath = path.resolve(__dirname, job.html);
    const outputPath = path.resolve(__dirname, '..', job.out);

    const page = await browser.newPage();
    await page.setViewport({ width: 1700, height: 1200, deviceScaleFactor: 2 });
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));

    const el = await page.$('#shot');
    await el.screenshot({ path: outputPath, type: 'png' });
    await page.close();
    console.log('OK:', job.out);
  }

  await browser.close();
})();
