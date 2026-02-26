const express = require('express');
const app = express();
const scrapRoute = require('./scrapRoute'); // notre route scrapper
const PORT = 3000;

// Pour servir le frontend
app.use(express.static('../Connect4'));

// Utiliser la route pour le scrapping
app.use('/', scrapRoute);

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
