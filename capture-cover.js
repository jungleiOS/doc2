const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(__dirname, '多口充电器选购指南-思维导图.html');
  const outputPath = path.resolve(__dirname, '多口充电器选购指南-封面.png');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    defaultViewport: {
      width: 2760,
      height: 1120,
      deviceScaleFactor: 1
    }
  });

  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const controls = document.getElementById('controls');
    const legend = document.querySelector('.legend');
    if (controls) controls.style.display = 'none';
    if (legend) legend.style.display = 'none';

    const container = document.getElementById('container');
    if (container) {
      container.style.width = '2760px';
      container.style.height = '1120px';
    }

    document.body.style.width = '2760px';
    document.body.style.height = '1120px';
    document.body.style.overflow = 'hidden';

    // Shorten root label
    const rootNode = document.querySelector('.node.root');
    if (rootNode) {
      const label = rootNode.querySelector('.node-label');
      const bg = rootNode.querySelector('.node-bg');
      if (label) label.textContent = '多口充电器选购指南';
      if (bg && label) {
        const bbox = label.getBBox();
        bg.setAttribute('width', bbox.width + 36);
      }
    }

    // Expand to level 2: collapse anything deeper than depth 2
    function collapseDeep(d) {
      if (!d) return;
      if (d.children) {
        d.children.forEach(child => {
          if (child.children) {
            child.children.forEach(deepChild => {
              if (deepChild.children) {
                collapseFrom(deepChild);
              }
            });
          }
        });
      }
    }

    function collapseFrom(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseFrom);
        d.children = null;
      }
    }

    if (window.root) {
      // First expand everything
      if (window.expand && window.root) {
        // custom expand
        function expandNode(d) {
          if (d._children) {
            d.children = d._children;
            d._children = null;
          }
          if (d.children) d.children.forEach(expandNode);
        }
        expandNode(root);
      }
      // Then collapse depth 3+
      collapseDeep(root);
      if (window.update) update(root);
    }

    setTimeout(() => {
      // Override resetZoom to fill the frame more aggressively for cover
      window.resetZoom = function() {
        const bounds = g.node().getBBox();
        const fullWidth = 2760;
        const fullHeight = 1120;
        const paddingX = 80;
        const paddingY = 60;
        const scale = Math.min(
          (fullWidth - paddingX * 2) / bounds.width,
          (fullHeight - paddingY * 2) / bounds.height,
          1.8
        );
        const translateX = paddingX - bounds.x * scale;
        const translateY = (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
      };
      if (window.resetZoom) resetZoom();
    }, 700);
  });

  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false
  });

  await browser.close();
  console.log('Screenshot saved:', outputPath);
})();
