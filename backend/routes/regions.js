const express = require("express");
const router = express.Router();
const pool = require("../db");

// contour unifié du Maroc
router.get("/maroc", async (req, res) => {
  try {
    const query = `
      SELECT ST_AsGeoJSON(ST_Union(geometry)) AS geometry
      FROM regions
      WHERE geometry IS NOT NULL
    `;

    const { rows } = await pool.query(query);

    if (!rows.length || !rows[0].geometry) {
      return res.status(404).json({ error: "Géométrie du Maroc introuvable" });
    }

    res.json({
      type: "Feature",
      geometry: JSON.parse(rows[0].geometry),
      properties: { nom: "Maroc" }
    });
  } catch (err) {
    console.error("Erreur /regions/maroc :", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT
        code_region,
        nom_region,
        nom_arabe,
        population_rgph_2024,
        ST_AsGeoJSON(geometry) AS geometry
      FROM regions
      WHERE geometry IS NOT NULL
      ORDER BY nom_region
    `;

    const { rows } = await pool.query(query);

    res.json({
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        geometry: JSON.parse(r.geometry),
        properties: {
          region: r.code_region,
          code_region: r.code_region,
          nom_region: r.nom_region,
          nom_arabe: r.nom_arabe,
          label: r.nom_region,
          population: r.population_rgph_2024
        }
      }))
    });
  } catch (err) {
    console.error("Erreur /regions :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;