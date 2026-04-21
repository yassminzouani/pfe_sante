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
    res.json(rows.map((r) => r.categorie));
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
      milieu,
      limit,
      bbox
    } = req.query;

    let query = `
      SELECT
        id,
        code,
        nom,
        abreviation_categorie,
        categorie,
        id_categorie,
        milieu,
        longitude,
        latitude,
        code_region,
        code_province,
        code_iso,
        delegation,
        cs,
        ST_AsGeoJSON(geometry) AS geometry
      FROM etablissements
      WHERE geometry IS NOT NULL
    `;

    const params = [];

    if (region) {
      params.push(String(region));
      query += ` AND code_region::text = $${params.length}`;
    }

    if (province) {
      params.push(String(province));
      query += ` AND code_province::text = $${params.length}`;
    }

    if (commune) {
      params.push(String(commune));
      query += ` AND code_iso::text = $${params.length}`;
    }

    if (categorie) {
      params.push(`%${categorie}%`);
      query += ` AND categorie ILIKE $${params.length}`;
    }

    if (milieu) {
      params.push(`%${milieu}%`);
      query += ` AND milieu ILIKE $${params.length}`;
    }

    if (bbox) {
      const parts = bbox.split(",").map(Number);

      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
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
        geometry: e.geometry ? JSON.parse(e.geometry) : null,
        properties: {
          id: e.id,
          code: e.code,
          nom: e.nom,
          abreviation_categorie: e.abreviation_categorie,
          categorie: e.categorie,
          id_categorie: e.id_categorie,
          milieu: e.milieu,
          longitude: e.longitude,
          latitude: e.latitude,
          code_region: e.code_region,
          code_province: e.code_province,
          code_iso: e.code_iso,
          delegation: e.delegation,
          cs: e.cs,
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