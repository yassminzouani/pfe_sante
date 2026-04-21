const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { region, province, commune, bbox, limit } = req.query;

    let query = `
      SELECT
        p.id,
        p.title,
        p.latitude,
        p.longitude,
        p.categorie,
        p.ville_normalisee,
        p.maps_url,
        p.commune_id,
        p.province_id,
        p.region_id,

        r.code_region,
        r.nom_region,

        pr.code_province,
        pr.nom AS nom_province,

        c.code_iso,
        c.nom AS nom_commune,

        ST_AsGeoJSON(p.geometry) AS geometry
      FROM pharmacies p
      LEFT JOIN regions r ON p.region_id = r.id
      LEFT JOIN provinces pr ON p.province_id = pr.id
      LEFT JOIN communes c ON p.commune_id = c.id
      WHERE p.geometry IS NOT NULL
    `;

    const params = [];

    if (region) {
      params.push(String(region));
      query += ` AND r.code_region::text = $${params.length}`;
    }

    if (province) {
      params.push(String(province));
      query += ` AND pr.code_province::text = $${params.length}`;
    }

    if (commune) {
      params.push(String(commune));
      query += ` AND c.code_iso::text = $${params.length}`;
    }

    if (bbox) {
      const parts = bbox.split(",").map(Number);

      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        const [west, south, east, north] = parts;
        params.push(west, south, east, north);

        query += `
          AND p.geometry && ST_MakeEnvelope(
            $${params.length - 3},
            $${params.length - 2},
            $${params.length - 1},
            $${params.length},
            4326
          )
        `;
      }
    }

    const rowLimit = Number(limit) > 0 ? Math.min(Number(limit), 10000) : 5000;
    params.push(rowLimit);
    query += ` ORDER BY p.title LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);

    res.json({
      type: "FeatureCollection",
      features: rows.map((p) => ({
        type: "Feature",
        geometry: p.geometry ? JSON.parse(p.geometry) : null,
        properties: {
          id: p.id,
          title: p.title,
          latitude: p.latitude,
          longitude: p.longitude,
          categorie: p.categorie,
          ville_normalisee: p.ville_normalisee,
          maps_url: p.maps_url,

          commune_id: p.commune_id,
          province_id: p.province_id,
          region_id: p.region_id,

          code_region: p.code_region,
          code_province: p.code_province,
          code_iso: p.code_iso,

          nom_region: p.nom_region,
          nom_province: p.nom_province,
          nom_commune: p.nom_commune,

          region: p.code_region,
          province: p.code_province,
          commune: p.code_iso,
          label: p.title
        }
      }))
    });
  } catch (err) {
    console.error("Erreur /pharmacies :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;