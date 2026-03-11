const express = require('express');
const app = express();
const scrapRoute = require('./scrapRoute');

const PORT = 4000; // ✅ IMPORTANT

app.use(express.static('../Connect4'));
app.use('/', scrapRoute);

app.listen(PORT, () => {
  console.log(`Scrapper lancé sur http://localhost:${PORT}`);
});