const puppeteer = require('puppeteer-core');

const shots = [
  { html: 'compliance-label.html', selector: '#card', out: '/Users/jiangjun/Documents/kimi/Workspaces/zhihu/充电宝3C新规选购指南/充电宝3C新规选购指南-合规标识说明.png' },
  { html: 'battery-cells.html', selector: '#card', out: '/Users/jiangjun/Documents/kimi/Workspaces/zhihu/充电宝3C新规选购指南/充电宝3C新规选购指南-电芯对比.png' },
  { html: 'port-types.html', selector: '#card', out: '/Users/jiangjun/Documents/kimi/Workspaces/zhihu/充电宝3C新规选购指南/充电宝3C新规选购指南-接口形态对比.png' },
  { html: 'product-cards.html', selector: '#card', out: '/Users/jiangjun/Documents/kimi/Workspaces/zhihu/充电宝3C新规选购指南/充电宝3C新规选购指南-好物决策卡.png' },
];

(async () => {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1600, deviceScaleFactor: 2 });

  for (const s of shots) {
    await page.goto(`http://127.0.0.1:8777/cover-assets/${s.html}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 800));
    const el = await page.$(s.selector);
    await el.screenshot({ path: s.out });
    console.log('done:', s.out);
  }

  await browser.close();
})();
