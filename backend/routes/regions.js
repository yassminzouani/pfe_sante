const express = require("express");
const router = express.Router();
const pool = require("../db");

// Maroc (union) -> masque
router.get("/maroc", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ST_AsGeoJSON(ST_Union(geometry)) AS geometry
      FROM regions
    `);

    res.json({
      type: "Feature",
      geometry: JSON.parse(rows[0].geometry),
      properties: {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regions -> polygones + props cohérentes
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        "CODE_REGIO" AS region_code,
        "nom_region" AS region_nom,
        ST_AsGeoJSON(geometry) AS geometry
      FROM regions
    `);

    res.json({
      type: "FeatureCollection",
      features: rows.map(r => ({
        type: "Feature",
        geometry: JSON.parse(r.geometry),
        properties: {
          region: r.region_code,   // <-- ce que ton map.js utilise pour filtrer
          label: r.region_nom,     // <-- ce que ton tooltip utilise
          region_code: r.region_code,
          region_nom: r.region_nom
        }
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;