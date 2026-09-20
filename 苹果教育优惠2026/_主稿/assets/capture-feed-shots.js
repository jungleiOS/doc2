const puppeteer = require('puppeteer-core');
const path = require('path');

// 返校季喂饭图素材：官网侧三张截图
// 1. 条款页「购买资格验证（支付宝）」段
// 2. iPad Air 教育价购买页
// 3. iPad Air 购买流程中的返校季换购步骤（Pencil Pro 补 50）
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
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = p => path.resolve(__dirname, 'shots', p);

  // ---- 1. 条款页 支付宝验证段 ----
  await page.goto('https://www.apple.com.cn/cn-k12/shop/back-to-school/terms-conditions', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim().startsWith('购买资格验证'));
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await sleep(1500);
  await page.screenshot({ path: out('apple-terms-alipay.png') });
  console.log('1. terms screenshot saved');

  // ---- 2. iPad Air 教育价页 ----
  await page.goto('https://www.apple.com.cn/cn-edu/shop/buy-ipad/ipad-air', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);
  await page.screenshot({ path: out('apple-ipadair-edu.png') });
  console.log('2. ipad air edu page saved');

  // ---- 3. 购买流程走到换购步骤 ----
  // 依次选：尺寸/颜色/存储/连接 各项的第一个选项
  const heads = ['选择尺寸', '选择你喜欢的颜色', '选择你需要的存储空间', '选择连线方式'];
  for (const h of heads) {
    await page.evaluate((head) => {
      const el = [...document.querySelectorAll('*')].find(e => e.children.length <= 2 && e.textContent.trim().startsWith(head));
      if (!el) return;
      const scope = el.closest('fieldset') || el.parentElement.parentElement.parentElement;
      const inp = scope && scope.querySelector('input[type="radio"]');
      if (inp) (inp.closest('label') || document.querySelector('label[for="' + inp.id + '"]') || inp).click();
    }, h);
    await sleep(800);
  }
  await sleep(2000);
  // 一路点「继续」，每步检查是否出现 Pencil 促销文案
  let captured = false;
  for (let i = 0; i < 6 && !captured; i++) {
    const state = await page.evaluate(() => {
      const body = document.body.innerText;
      const hasPencil = /Pencil/.test(body);
      const btns = [...document.querySelectorAll('button')];
      const cont = btns.find(b => b.textContent.trim() === '继续');
      const bag = btns.find(b => /添加至购物袋|加入购物袋/.test(b.textContent));
      if (cont) cont.click();
      else if (bag) bag.click();
      return { hasPencil, action: cont ? '继续' : (bag ? '购物袋' : 'none') };
    });
    console.log('step', i, JSON.stringify(state));
    await sleep(2000);
    // 每一步都截一张，事后挑有 Pencil 促销信息的
    await page.screenshot({ path: out('apple-buyflow-step' + i + '.png') });
    if (state.action === '购物袋' || state.action === 'none') break;
  }
  console.log('3. buyflow steps saved');

  await browser.close();
})();
