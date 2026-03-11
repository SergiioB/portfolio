const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    const htmlPath = 'file://' + path.resolve(__dirname, 'og-preview.html');
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'og-preview.png' });
    await page.screenshot({ path: '../../dist/images/og-preview.png' });
    await browser.close();
    console.log('Images generated successfully!');
})();
