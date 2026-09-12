const puppeteer = require('puppeteer-core');
const path = require('path');

const dir = path.join(__dirname, 'panther-lake-assets');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  // Shot 1: Chip image from 2nm article
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('https://zhuanlan.zhihu.com/p/1992730187817838426', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const result = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const contentImgs = imgs.filter(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('zhimg.com') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo');
      });
      
      if (contentImgs.length === 0) return { error: 'No content images found', totalImgs: imgs.length };
      
      const first = contentImgs[0];
      const rect = first.getBoundingClientRect();
      return {
        count: contentImgs.length,
        firstSrc: first.getAttribute('src').substring(0, 80),
        box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      };
    });
    
    console.log('Shot 1 debug:', JSON.stringify(result));
    
    if (result.box && result.box.w > 100) {
      const pad = 30;
      await page.screenshot({
        path: path.join(dir, 'chip-panther-lake.png'),
        clip: { x: result.box.x - pad, y: result.box.y - pad, width: result.box.w + pad*2, height: result.box.h + pad*2 },
        type: 'png',
      });
      console.log('✓ chip-panther-lake.png');
    }
    await page.close();
  }

  // Shot 2: Specs table (second unique image)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('https://zhuanlan.zhihu.com/p/1992730187817838426', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const result = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const contentImgs = imgs.filter(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('zhimg.com') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo');
      });
      
      // Get unique images by src
      const unique = [];
      const seen = new Set();
      for (const img of contentImgs) {
        const src = img.getAttribute('src') || '';
        if (!seen.has(src)) {
          seen.add(src);
          unique.push(img);
        }
      }
      
      if (unique.length < 2) return { error: 'Less than 2 unique images', count: unique.length };
      
      const second = unique[1];
      const rect = second.getBoundingClientRect();
      return {
        uniqueCount: unique.length,
        secondSrc: second.getAttribute('src').substring(0, 80),
        box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      };
    });
    
    console.log('Shot 2 debug:', JSON.stringify(result));
    
    if (result.box && result.box.w > 100) {
      const pad = 30;
      await page.screenshot({
        path: path.join(dir, 'specs-pros-cons.png'),
        clip: { x: result.box.x - pad, y: result.box.y - pad, width: result.box.w + pad*2, height: result.box.h + pad*2 },
        type: 'png',
      });
      console.log('✓ specs-pros-cons.png');
    }
    await page.close();
  }

  // Shot 3: Panther Lake laptop product photo - try the HP EliteBook review
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('https://www.zhihu.com/question/2007180191403889649', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const result = await page.evaluate(() => {
      // Look for images in answer content
      const imgs = [...document.querySelectorAll('img')];
      const contentImgs = imgs.filter(img => {
        const src = img.getAttribute('src') || '';
        const rect = img.getBoundingClientRect();
        return src.includes('zhimg.com') && rect.width > 200 && rect.height > 100;
      });
      
      if (contentImgs.length === 0) return { error: 'No large images found', totalImgs: imgs.length };
      
      const first = contentImgs[0];
      const rect = first.getBoundingClientRect();
      return {
        count: contentImgs.length,
        firstSrc: first.getAttribute('src').substring(0, 80),
        box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      };
    });
    
    console.log('Shot 3 debug:', JSON.stringify(result));
    
    if (result.box && result.box.w > 100) {
      const pad = 30;
      await page.screenshot({
        path: path.join(dir, 'panther-lake-laptop.png'),
        clip: { x: result.box.x - pad, y: result.box.y - pad, width: result.box.w + pad*2, height: result.box.h + pad*2 },
        type: 'png',
      });
      console.log('✓ panther-lake-laptop.png');
    }
    await page.close();
  }

  await browser.close();
  console.log('Done!');
})();
