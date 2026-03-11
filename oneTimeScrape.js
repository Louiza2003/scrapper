const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");

puppeteer.use(StealthPlugin());

(async () => {
   const browser = await puppeteer.launch({
      headless: false,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: path.join(__dirname, "automation-profile"),
      args: ["--start-maximized", "--disable-blink-features=AutomationControlled"]
   });

   const page = await browser.newPage();
   await page.setViewport({ width: 1366, height: 768 });

   // Open homepage ONLY
   await page.goto("https://boardgamearena.com/", {
      waitUntil: "networkidle2"
   });

   console.log("Log in manually in the opened browser.");
   console.log("When fully logged in and dashboard is visible, close the browser window.");

   // Keep browser open until you close it manually
   await new Promise(() => { });
})();
