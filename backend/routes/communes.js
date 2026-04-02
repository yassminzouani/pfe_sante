const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { region, province, code_region, code_province } = req.query;

    const regionFilter = code_region || region;
    const provinceFilter = code_province || province;

    let query = `
      SELECT
        code_iso,
        nom,
        code_province,
        code_region,
        population_rgph_2024,
        ST_AsGeoJSON(ST_MakeValid(geometry)) AS geometry
      FROM communes
      WHERE geometry IS NOT NULL
    `;

    const params = [];

    if (regionFilter) {
      params.push(String(regionFilter));
      query += ` AND code_region::text = $${params.length}`;
    }

    if (provinceFilter) {
      params.push(String(provinceFilter));
      query += ` AND code_province::text = $${params.length}`;
    }

    query += ` ORDER BY nom`;

    const { rows } = await pool.query(query, params);

    res.json({
      type: "FeatureCollection",
      features: rows
        .filter((c) => c.geometry)
        .map((c) => ({
          type: "Feature",
          geometry: JSON.parse(c.geometry),
          properties: {
            commune: c.code_iso,
            code_iso: c.code_iso,
            nom: c.nom,
            province: c.code_province,
            code_province: c.code_province,
            region: c.code_region,
            code_region: c.code_region,
            population: c.population_rgph_2024,
            label: c.nom
          }
        }))
    });
  } catch (err) {
    console.error("Erreur /communes :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;