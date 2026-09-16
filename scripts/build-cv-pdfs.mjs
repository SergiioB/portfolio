import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const root = fileURLToPath(new URL("../", import.meta.url));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
try {
  for (const suffix of ["", "-es"]) {
    const source = resolve(root, `public/docs/cv-sergio-barrientos${suffix}.html`);
    const output = source.replace(/\.html$/, ".pdf");
    const page = await browser.newPage();
    await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: output,
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      tagged: true,
    });
    await page.close();
    console.log(output);
  }
  await copyFile(
    resolve(root, "public/docs/cv-sergio-barrientos.pdf"),
    resolve(root, "public/docs/cv-public.pdf")
  );
} finally {
  await browser.close();
}
