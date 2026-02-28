import fs from 'fs';
import { chromium } from 'playwright';

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 630px;
      width: 1200px;
      box-sizing: border-box;
      border: 8px solid #30363d;
      background-image: 
        linear-gradient(rgba(201, 209, 217, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201, 209, 217, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      position: relative;
    }
    .container {
      text-align: center;
      z-index: 10;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border: 1px solid #30363d;
      border-radius: 20px;
      color: #8b949e;
      font-size: 24px;
      margin-bottom: 30px;
      background: #161b22;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    .title {
      font-size: 85px;
      font-weight: 800;
      color: #c9d1d9;
      margin: 0 0 20px 0;
      line-height: 1.1;
      letter-spacing: -2px;
    }
    .subtitle {
      font-size: 42px;
      color: #58a6ff;
      margin: 0;
      font-weight: 500;
    }
    .footer {
      position: absolute;
      bottom: 40px;
      left: 60px;
      font-size: 28px;
      color: #8b949e;
      display: flex;
      align-items: center;
      width: calc(100% - 120px);
      justify-content: space-between;
    }
    .url {
      color: #8b949e;
      font-weight: 500;
      font-family: "Fira Code", monospace;
    }
    .role {
      color: #3fb950;
      font-weight: 600;
    }
    .glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 400px;
      background: radial-gradient(circle, rgba(88,166,255,0.15) 0%, rgba(13,17,23,0) 70%);
      z-index: 0;
      pointer-events: none;
    }
    .code-deco {
      position: absolute;
      top: 40px;
      right: 60px;
      color: #30363d;
      font-family: "Fira Code", monospace;
      font-size: 24px;
      text-align: right;
      z-index: 0;
    }
  </style>
</head>
<body>
  <div class="glow"></div>
  <div class="code-deco">
    import { Architect } from '@enterprise/infra';<br/>
    const mode = "Engineer";
  </div>
  <div class="container">
    <div class="badge">Engineer Mode : Active</div>
    <div class="title">Sergio B.</div>
    <div class="subtitle">Field Notes & Architecture Hub</div>
  </div>
  <div class="footer">
    <div class="role">Linux & Virtualization Engineer</div>
    <div class="url">SergiioB.github.io/portfolio</div>
  </div>
</body>
</html>
`;

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1200, height: 630 });
  
  console.log('Setting HTML content...');
  await page.setContent(html, { waitUntil: 'load' });
  
  // ensure the directory exists just in case
  if (!fs.existsSync('public/images')) {
      fs.mkdirSync('public/images', { recursive: true });
  }

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'public/images/og-preview.png' });
  
  await browser.close();
  console.log('Successfully generated public/images/og-preview.png');
})();
