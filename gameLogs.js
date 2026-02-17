const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const games = require("../connect-four-results.json");

puppeteer.use(StealthPlugin());

/* -------------------- CONFIG -------------------- */

const SCRAPED_FILE = "./scraped.json";

/* -------------------- HELPERS -------------------- */

function randomDelay(min = 800, max = 2500) {
   const delay = Math.floor(Math.random() * (max - min) + min);
   return new Promise(res => setTimeout(res, delay));
}

async function humanClick(page, selector) {
   const element = await page.waitForSelector(selector, { visible: true });
   const box = await element.boundingBox();

   await page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2,
      { steps: 12 }
   );

   await randomDelay(200, 700);
   await element.click();
}

/* -------------------- LOAD STATE -------------------- */

let scraped = new Set();

if (fs.existsSync(SCRAPED_FILE)) {
   scraped = new Set(
      JSON.parse(fs.readFileSync(SCRAPED_FILE, "utf-8"))
   );
}

/* -------------------- MAIN -------------------- */

(async () => {
   const browser = await puppeteer.launch({
      headless: false,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: "./automation-profile",
      args: [
         "--start-maximized",
         "--disable-blink-features=AutomationControlled"
      ]
   });

   const page = await browser.newPage();

   await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
   );

   await page.setViewport({ width: 1366, height: 768 });

   for (const game of games) {
      const url = game.tableUrl;
      const tableId = new URL(url).searchParams.get("table");

      if (!tableId) continue;

      if (scraped.has(tableId)) {
         console.log(`Skipping ${tableId} (already scraped)`);
         continue;
      }

      try {
         console.log(`Processing table ${tableId}...`);

         await page.goto(url, { waitUntil: "networkidle2" });
         await randomDelay(1500, 4000);

         /* 1️⃣ Review game */
         await humanClick(page, "#reviewgame");
         await randomDelay(1500, 3500);

         /* 2️⃣ Choose player */
         await page.waitForSelector(".choosePlayerLink", { timeout: 15000 });

         await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle2" }),
            humanClick(page, ".choosePlayerLink")
         ]);

         await randomDelay(2000, 5000);

         /* 3️⃣ Wait for replay logs */
         await page.waitForFunction(
            () => typeof g_gamelogs !== "undefined" && g_gamelogs.length > 0,
            { timeout: 20000 }
         );

         await randomDelay(1000, 3000);

         /* 4️⃣ Extract signature */
         const signature = await page.evaluate(() => {
            if (typeof g_gamelogs === "undefined") return null;

            const moveMap = new Map();

            for (const packet of g_gamelogs) {
               if (!packet.data) continue;

               for (const evt of packet.data) {
                  if (evt.type === "playDisc") {
                     moveMap.set(packet.move_id, evt.args.x);
                  }
               }
            }

            return [...moveMap.entries()]
               .sort((a, b) => a[0] - b[0])
               .map(([, col]) => col)
               .join("");
         });

         if (!signature) {
            console.log(`No signature found for ${tableId}`);
            continue;
         }

         /* 5️⃣ Persist results */
         fs.writeFileSync(`./data/game_${tableId}.txt`, signature, "utf-8");

         scraped.add(tableId);
         fs.writeFileSync(
            SCRAPED_FILE,
            JSON.stringify([...scraped], null, 2)
         );

         console.log(`Saved ${tableId}: ${signature}`);

         await randomDelay(4000, 9000);

      } catch (err) {
         console.error(`Error on ${tableId}:`, err.message);
      }
   }

   await browser.close();
})();
