const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const filePath = "file://" + path.resolve('2-HOST-ONLINE/index.html');
  
  let errors = [];
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto(filePath);
  
  if (errors.length > 0) {
    console.log("ERRORS_FOUND:");
    console.log(errors.join('\n'));
  } else {
    console.log("NO_ERRORS");
    
    // Light mode screenshot
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluate(() => document.documentElement.dataset.theme = 'light');
    await page.screenshot({ path: 'light-mode.png', fullPage: true });
    
    // Dark mode screenshot
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
    await page.screenshot({ path: 'dark-mode.png', fullPage: true });
    
    console.log("Screenshots taken.");
  }
  
  await browser.close();
})();
