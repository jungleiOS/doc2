const puppeteer = require('puppeteer-core');
const path = require('path');
const DIR = __dirname;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: { width: 900, height: 1000, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();
  await page.goto('https://news.mydrivers.com/1/1162/1162595.htm', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // 清除悬浮广告/弹窗/遮罩
  await page.evaluate(() => {
    const kill = (el) => { try { el.remove(); } catch (e) {} };
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && el.children.length < 12) kill(el);
      if (el.id && /(popup|overlay|mask|ad|hongbao|redpacket|float)/i.test(el.id)) kill(el);
      if (el.className && typeof el.className === 'string' && /(popup|overlay|mask|hongbao|redpacket|float)/i.test(el.className)) kill(el);
    });
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  });
  await new Promise(r => setTimeout(r, 500));

  const jobs = [
    { match: '颐高数码城', out: '配图-快科技11月2日报道杭州商户引语.png' },
    { match: '公摊面积', out: '配图-快科技11月2日报道公摊面积适配.png' },
  ];
  for (const job of jobs) {
    const el = await page.evaluateHandle((m) => {
      return [...document.querySelectorAll('p')].find(p => p.innerText.includes(m)) || null;
    }, job.match);
    const node = el.asElement();
    if (!node) { console.log('未找到', job.match); continue; }
    await node.scrollIntoView();
    await new Promise(r => setTimeout(r, 300));
    await node.screenshot({ path: path.resolve(DIR, job.out), type: 'png' });
    console.log('✓', job.out);
  }
  await browser.close();
})();
