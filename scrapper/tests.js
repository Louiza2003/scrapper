const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

function randomDelay(min = 800, max = 2500) {
   const delay = Math.floor(Math.random() * (max - min) + min);
   return new Promise(res => setTimeout(res, delay));
}

async function humanClick(page, selector) {
   const element = await page.waitForSelector(selector, { visible: true });
   const box = await element.boundingBox();

   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
   await randomDelay(200, 700);
   await element.click();
}

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

   const url = "https://boardgamearena.com/table?table=801839027" // <-- put actual table URL here
   const tableId = "801839027"; // hardcode for test

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
      await page.waitForFunction(() => typeof g_gamelogs !== "undefined" && g_gamelogs.length > 0, { timeout: 20000 });
      await randomDelay(1000, 3000);

      /* 4️⃣ Extract game data */
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

      /* 5️⃣ Persist results */
      fs.writeFileSync(`./data/game_${tableId}.json`, JSON.stringify(gameData, null, 2), "utf-8");
          console.log(gameData);


   } catch (err) {
      console.error(`Error on ${tableId}:`, err.message);
   }

   await browser.close();
})();
