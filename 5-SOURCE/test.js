const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  await page.goto('file:///Users/macbook/Documents/Etsy/Resume-planner/2-HOST-ONLINE/index.html');
  await browser.close();
})();
