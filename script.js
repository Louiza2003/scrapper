const randomDelay = require("./AntiBot");
const puppeteer = require("puppeteer-core");
const fs = require("fs");

(async () => {

   const browser = await puppeteer.launch({
      headless: false,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: "./automation-profile",
   });


   const page = await browser.newPage();

   await page.goto("https://boardgamearena.com/player?id=94154229", {
      waitUntil: "networkidle2"
   });

   console.log("You are already logged in.");

   await randomDelay(300,500);
   await page.waitForSelector('#pageheader_lastresults');
   await randomDelay(300,500);
   await page.click('#pageheader_lastresults');

   let allConnectFourPosts = [];
   while (true) {

      // Wait until posts are present
      await page.waitForSelector(".post");

      // Extract current page posts
      const newPosts = await page.evaluate(() => {
         const posts = Array.from(document.querySelectorAll(".post"));

         return posts
            .filter(post => {
               const gameNameEl = post.querySelector(".gamename");
               return gameNameEl && gameNameEl.textContent.trim() === "Connect Four";
            })
            .map(post => {
               const tableLink = post.querySelector(".postmessage a[href*='/table?']");
               const date = post.querySelector(".postdate");
               const players = Array.from(post.querySelectorAll(".playername"))
                  .map(p => p.textContent.trim());

               return {
                  tableUrl: tableLink ? tableLink.href : null,
                  date: date ? date.textContent.trim() : null,
                  players
               };
            });
      });

      allConnectFourPosts.push(...newPosts);
      console.log(allConnectFourPosts);
      fs.writeFileSync(
         "./connect-four-results.json",
         JSON.stringify(allConnectFourPosts, null, 2),
         "utf-8"
      );

      console.log("File saved successfully.");

      // Check if "See more..." exists
      const seeMoreButton = await page.$("#board_seemore_r");

      if (!seeMoreButton) {
         break; // no more pages
      }

      // Scroll to make sure button is visible
      await page.evaluate(() => {
         // document.querySelector("#board_seemore_r")?.scrollIntoView();
      });

      // Click it
      await seeMoreButton.click();

      // Wait for new content to load
      await randomDelay(1000,3000)
   }


})();
