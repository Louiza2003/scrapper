function randomDelay() {
   const delay = Math.floor(Math.random() * (12000 - 8000 + 1)) + 8000;
   return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = randomDelay;


