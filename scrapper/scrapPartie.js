const axios = require('axios');
const cheerio = require('cheerio');

async function scrapPartie(partieId) {
  const url = `https://boardgamearena.com/#!table/${partieId}`;
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);

  const joueurs = [];
  $('.player_name').each((i, el) => {
    joueurs.push($(el).text().trim());
  });

  const coups = [];
  $('.move').each((i, el) => {
    coups.push($(el).text().trim());
  });

  return { partieId, joueurs, coups };
}

module.exports = scrapPartie;
