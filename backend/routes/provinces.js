const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { region } = req.query;

    let query = `
      SELECT
        code_province,
        code_region,
        nom,
        superficie,
        population_rgph_2024,
        ST_AsGeoJSON(geometry) AS geometry
      FROM provinces
      WHERE geometry IS NOT NULL
    `;

    const params = [];

    if (region) {
      params.push(String(region));
      query += ` AND code_region::text = $${params.length}`;
    }

    query += ` ORDER BY nom`;

    const { rows } = await pool.query(query, params);

    res.json({
      type: "FeatureCollection",
      features: rows
        .filter((p) => p.geometry)
        .map((p) => ({
          type: "Feature",
          geometry: JSON.parse(p.geometry),
          properties: {
            code_province: p.code_province,
            code_region: p.code_region,
            nom: p.nom,
            superficie: p.superficie,
            population_rgph_2024: p.population_rgph_2024,
            province: p.code_province,
            region: p.code_region,
            label: p.nom,
            population: p.population_rgph_2024,
          },
        })),
    });
  } catch (err) {
    console.error("Erreur /provinces :", err);
    res.status(500).json({
      error: err.message,
      detail: err.detail || null,
      hint: err.hint || null,
    });
  }
});

module.exports = router;