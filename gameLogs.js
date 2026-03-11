const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const games = require("./connect-four-results.json");

puppeteer.use(StealthPlugin());

/* -------------------- CONFIG -------------------- */
const SCRAPED_FILE = path.join(__dirname, "scraped.json");
const DATA_DIR = path.join(__dirname, "data");
const LOGS_DIR = path.join(__dirname, "logs");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function logStep(tableId, message) {
   const logPath = path.join(LOGS_DIR, `log_${tableId}.txt`);
   fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
   console.log(`[${tableId}] ${message}`);
}

/* -------------------- HELPERS -------------------- */
function randomDelay(min = 800, max = 2500) {
   const delay = Math.floor(Math.random() * (max - min) + min);
   return new Promise(res => setTimeout(res, delay));
}

async function humanClick(page, selector, tableId) {
   const element = await page.waitForSelector(selector, { visible: true });
   const box = await element.boundingBox();
   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
   await randomDelay(200, 700);
   await element.click();
   logStep(tableId, `Clicked on selector: ${selector}`);
}

function delay(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------- LOAD STATE -------------------- */
let scraped = new Set();
if (fs.existsSync(SCRAPED_FILE)) {
   scraped = new Set(JSON.parse(fs.readFileSync(SCRAPED_FILE, "utf-8")));
}

/* -------------------- MAIN -------------------- */
(async () => {
   const browser = await puppeteer.launch({
      headless: false,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: "./automation-profile",
      args: ["--start-maximized", "--disable-blink-features=AutomationControlled"]
   });

   const page = await browser.newPage();
   await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
   await page.setViewport({ width: 1366, height: 768 });

   for (const game of games) {
      const url = game.tableUrl;
      const tableId = new URL(url).searchParams.get("table");
      if (!tableId) continue;

      if (scraped.has(tableId)) {
         logStep(tableId, `Skipping (already scraped)`);
         continue;
      }

      try {
         logStep(tableId, `Processing table ${tableId}...`);
         await page.goto(url, { waitUntil: "networkidle2" });
         logStep(tableId, `Page loaded: ${url}`);
         await randomDelay(1500, 4000);

         /* Extract board size */
         const boardSize = await page.$eval("#mob_gameoption_100_displayed_value", el => el.textContent.trim());
         logStep(tableId, `Board size: ${boardSize}`);

         /* 1️⃣ Review game */
         await humanClick(page, "#reviewgame", tableId);
         await randomDelay(1500, 3500);

         /* 2️⃣ Choose player using normal selector */
         logStep(tableId, "Waiting for player selection...");
         await delay(3000); // ensure panel is loaded

         const chooseLinks = await page.$$(".choosePlayerLink");
         let clicked = false;
         for (const link of chooseLinks) {
            const text = await page.evaluate(el => el.textContent, link);
            if (text.includes("Choose this player")) {
               await link.click();
               clicked = true;
               break;
            }
         }
         if (!clicked) throw new Error("Player selection link not found");
         logStep(tableId, "Clicked on choose player link");
         await page.waitForNavigation({ waitUntil: "networkidle2" });
         await randomDelay(2000, 5000);

         /* 3️⃣ Wait for replay logs */
         await page.waitForFunction(() => typeof g_gamelogs !== "undefined" && g_gamelogs.length > 0, { timeout: 20000 });
         logStep(tableId, "Replay logs loaded");
         await randomDelay(1000, 3000);

         /* 4️⃣ Extract full game data */
         const gameData = await page.evaluate(() => {
            const moveMap = new Map();
            let startingPlayer = null;
            let winningPlayer = null;
            let status = "ongoing";
            let winningLine = [];

            for (const packet of g_gamelogs) {
               if (!packet.data) continue;
               for (const evt of packet.data) {
                  if (evt.type === "playDisc") {
                     moveMap.set(packet.move_id, evt.args.x);
                     if (packet.move_id === "2") startingPlayer = evt.args.player_id;
                  }
                  if (evt.type === "won" && evt.args) {
                     status = "finished";
                     winningPlayer = evt.args.player_id;
                     winningLine = [];
                     for (let i = 1; i <= 4; i++) {
                        const key = `win${i}`;
                        if (evt.args[key] != null) winningLine.push(evt.args[key]);
                     }
                  }
               }
            }

            return {
               signature: [...moveMap.entries()].sort((a, b) => a[0] - b[0]).map(([, col]) => col).join(""),
               status,
               starting_player: startingPlayer,
               winning_player: winningPlayer,
               winning_line: winningLine
            };
         });

         gameData.board_size = boardSize;

         logStep(tableId, `Game data extracted: ${JSON.stringify(gameData)}`);

         /* 5️⃣ Persist results */
         fs.writeFileSync(path.join(DATA_DIR, `game_${tableId}.json`), JSON.stringify(gameData, null, 2), "utf-8");
         logStep(tableId, `Game data saved`);

         scraped.add(tableId);
         fs.writeFileSync(SCRAPED_FILE, JSON.stringify([...scraped], null, 2));
         logStep(tableId, `Scraped file updated`);

         await randomDelay(4000, 9000);

      } catch (err) {
         logStep(tableId, `Error: ${err.message}`);
      }
   }

   await browser.close();
})();
