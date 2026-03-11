const express = require("express");
const router = express.Router();
const scrapPartie = require("./scrapPartie"); // ✅ FIX ICI

// route: GET /scrap/:partieId
router.get("/scrap/:partieId", async (req, res) => {
  const { partieId } = req.params;

  try {
    const partieData = await scrapPartie(partieId);
    res.json(partieData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Erreur scrap" });
  }
});

module.exports = router;