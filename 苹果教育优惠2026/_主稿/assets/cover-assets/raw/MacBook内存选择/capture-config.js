// 截苹果官网 MacBook Pro 定制配置页「统一内存」分组（24GB→48GB 加价界面）
// 流程：尺寸 → 颜色 → 显示屏 → 芯片(M5 Pro) → CPU档位 → 展开「编辑统一内存」→ 截图
// 用法：node capture-config.js
// 输出：MacBook内存选择-苹果官网配置页-内存选配.png（deviceScaleFactor 2）
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  const baseUrl = 'https://www.apple.com.cn/shop/buy-mac/macbook-pro';
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const select = async (autom) => {
    await page.waitForFunction((a) => {
      const i = document.querySelector(`input[data-autom="${a}"]`);
      return i && !i.disabled;
    }, { timeout: 20000 }, autom);
    const h = await page.evaluateHandle((a) => {
      const i = document.querySelector(`input[data-autom="${a}"]`);
      return document.querySelector(`label[for="${i.id}"]`);
    }, autom);
    const label = h.asElement();
    if (!label) throw new Error('未找到 label: ' + autom);
    await label.click();
    await new Promise(r => setTimeout(r, 2500));
    const checked = await page.evaluate((a) => {
      const i = document.querySelector(`input[data-autom="${a}"]`);
      return i ? i.checked : null;
    }, autom);
    console.log(`选 ${autom}:`, checked);
    return checked;
  };

  await select('chassis-dimensionScreensize14inch');
  await select('chassis-dimensionColorspaceblack');
  await select('display-dimensionFinishstandard');
  await select('processor-dimensionChipm5pro'); // 当前在售，M4 Pro 已下架
  await select('processor-dimensionChip-cpuCoreCount-gpuCoreCountm5pro-15-16'); // 基础档位「已含」

  // 等内存选项渲染后，点「编辑统一内存」展开
  await page.waitForFunction(() => {
    const inputs = [...document.querySelectorAll('input[data-autom]')];
    return inputs.some(i => /memory/i.test(i.getAttribute('data-autom') || '') && !i.disabled);
  }, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  const editBtn = await page.$('button[data-autom="edit-memory-dimensionMemory"]');
  if (!editBtn) throw new Error('未找到「编辑统一内存」按钮');
  await editBtn.click();
  // 等选项行可见
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('.rc-dimension-selector-row.form-selector')];
    return rows.some(r => (r.textContent || '').includes('48GB') && r.offsetHeight > 0);
  }, { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1200));

  // 找内存分组可见容器（含标题与 48GB 加价选项）
  const groupInfo = await page.evaluate(() => {
    const memInput = document.querySelector('input[data-autom="memory-dimensionMemory_24gb"]');
    const candidates = [];
    let g = memInput.parentElement;
    for (let i = 0; i < 8 && g; i++) {
      const t = (g.textContent || '').replace(/\s+/g, '');
      if (t.includes('统一内存') && t.includes('48GB') && t.includes('+RMB') && g.offsetHeight > 0 && g.offsetHeight < 4000) {
        candidates.push(g);
      }
      g = g.parentElement;
    }
    if (!candidates.length) throw new Error('未找到可见内存分组容器');
    const box = candidates[0];
    box.setAttribute('data-shot-mem', '1');
    box.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -150); // 抵消吸顶导航遮挡
    return { text: (box.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300), h: box.offsetHeight, w: box.offsetWidth };
  });
  console.log('内存分组:', JSON.stringify(groupInfo));

  const el = await page.evaluateHandle(() => document.querySelector('[data-shot-mem="1"]'));
  const outPath = path.resolve(__dirname, 'MacBook内存选择-苹果官网配置页-内存选配.png');
  await el.asElement().screenshot({ path: outPath, type: 'png' });
  console.log('页面 URL:', page.url());
  console.log('OK:', outPath);
  await browser.close();
})();
