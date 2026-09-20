// 截图 Apple 支持页「Apple 智能当前在中国大陆购买的受支持设备上不可用」注释区域（元素级截图）
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto('https://support.apple.com/zh-cn/guide/iphone/iphc28624b81/ios', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  const handle = await page.evaluateHandle(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.includes('Apple 智能当前在中国大陆购买的受支持设备上不可用')) {
        // 向上找最近的 aside / note 容器，最多 6 层
        let cur = node.parentElement;
        for (let i = 0; i < 6 && cur.parentElement; i++) {
          const tag = cur.tagName.toLowerCase();
          const cls = (cur.className || '').toString();
          if (tag === 'aside' || cls.match(/note|callout|protip/i)) return cur;
          cur = cur.parentElement;
        }
        return node.parentElement;
      }
    }
    return null;
  });
  const el = handle.asElement();
  if (!el) {
    console.error('未找到声明文字');
    await browser.close();
    process.exit(1);
  }
  await el.screenshot({ path: 'apple-support-ai-unavailable.png' });
  const box = await el.boundingBox();
  await browser.close();
  console.log('done', JSON.stringify(box));
})();
