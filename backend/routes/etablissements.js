const express = require("express");
const router = express.Router();
const pool = require("../db");

// catégories
router.get("/categories", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT categorie
      FROM etablissements
      WHERE categorie IS NOT NULL
        AND TRIM(categorie) <> ''
      ORDER BY categorie
    `;
    const { rows } = await pool.query(query);
    res.json(rows.map(r => r.categorie));
  } catch (err) {
    console.error("Erreur /etablissements/categories :", err);
    res.status(500).json({ error: err.message });
  }
});

// établissements pour la carte
router.get("/", async (req, res) => {
  try {
    const {
      region,
      province,
      commune,
      categorie,
      reseau,
      milieu,
      limit,
      bbox
    } = req.query;

    let query = `
      SELECT
        code,
        nom,
        categorie,
        reseau,
        milieu,
        code_region,
        code_province,
        code_iso,
        ST_AsGeoJSON(geometry) AS geometry
      FROM etablissements
      WHERE geometry IS NOT NULL
    `;

    const params = [];

    if (region) {
      params.push(region);
      query += ` AND code_region = $${params.length}`;
    }

    if (province) {
      params.push(province);
      query += ` AND code_province = $${params.length}`;
    }

    if (commune) {
      params.push(commune);
      query += ` AND code_iso = $${params.length}`;
    }

    if (categorie) {
      params.push(`%${categorie}%`);
      query += ` AND categorie ILIKE $${params.length}`;
    }

    if (reseau) {
      params.push(`%${reseau}%`);
      query += ` AND reseau ILIKE $${params.length}`;
    }

    if (milieu) {
      params.push(`%${milieu}%`);
      query += ` AND milieu ILIKE $${params.length}`;
    }

    // bbox = west,south,east,north
    if (bbox) {
      const parts = bbox.split(",").map(Number);
      if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
        const [west, south, east, north] = parts;
        params.push(west, south, east, north);

        query += `
          AND geometry && ST_MakeEnvelope(
            $${params.length - 3},
            $${params.length - 2},
            $${params.length - 1},
            $${params.length},
            4326
          )
        `;
      }
    }

    query += ` ORDER BY nom`;

    const rowLimit = Number(limit) > 0 ? Math.min(Number(limit), 10000) : 3000;
    params.push(rowLimit);
    query += ` LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);

    res.json({
      type: "FeatureCollection",
      features: rows.map((e) => ({
        type: "Feature",
        geometry: JSON.parse(e.geometry),
        properties: {
          code: e.code,
          nom: e.nom,
          categorie: e.categorie,
          reseau: e.reseau,
          milieu: e.milieu,
          code_region: e.code_region,
          code_province: e.code_province,
          code_iso: e.code_iso,
          region: e.code_region,
          province: e.code_province,
          commune: e.code_iso,
          label: e.nom
        }
      }))
    });
  } catch (err) {
    console.error("Erreur /etablissements :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;