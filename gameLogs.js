const fs = require("fs");
const randomDelay = require("./AntiBot");
const puppeteer = require("puppeteer-core");
const games = require("../connect-four-results.json");

(async () => {
   const browser = await puppeteer.launch({
      headless: false,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: "./automation-profile",
   });

   for (const game of games) {
      const page = await browser.newPage();
      const url = game.tableUrl;

      await page.goto(url, { waitUntil: "networkidle2" });
      await randomDelay();

      await page.waitForSelector('#reviewgame');
      await page.click("#reviewgame");

      await page.waitForSelector("#gamelogs");
      // await page.waitForSelector(".smalltext", { timeout: 5000 });
      await page.waitForSelector(".gamelogreview ", { timeout: 5000 });

      const logs = await page.evaluate(() => {
         return Array.from(document.querySelectorAll('.gamelogreview'))
            .flatMap(el => {
               const matches = el.innerText.match(/\b[1-7]\b/g);
               return matches ? matches.map(Number) : [];
            });


         })

      // Create a unique filename, e.g., by game ID or table name
      const tableId = url.split("table=")[1]; // "806886109" // fallback if no id
      const filePath = `game_${tableId}.json`;

      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf-8");
      console.log(`Saved logs for game ${tableId}`);

      await page.close();
   }

   await browser.close();
   
})();



