const express = require('express');
const router = express.Router();
const scrapPartie = require('../SCRAPPER/Scrapper/scrapPartie');

// Fonction simulant la sauvegarde dans la BDD
async function savePartieToDB(partieData) {
  console.log("Partie sauvegardée dans la BDD :", partieData.partieId);
}

router.get('/scrap/:partieId', async (req, res) => {
  const { partieId } = req.params;

  try {
    const partieData = await scrapPartie(partieId);  // appelle ton scrapper
    await savePartieToDB(partieData);               // sauvegarde (simulée)
    res.json(partieData);                           // renvoie au frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer la partie" });
  }
});

module.exports = router;
