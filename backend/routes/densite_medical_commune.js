const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      WITH public_stats AS (
        SELECT
          e.code_iso,
          COALESCE(SUM(m.nombre), 0) AS nb_medecins_publics
        FROM etablissements e
        LEFT JOIN medecins m
          ON e.id = m.id_etablissement
        WHERE e.code_iso IS NOT NULL
        GROUP BY e.code_iso
      ),
      prive_stats AS (
        SELECT
          mp.code_iso,
          COALESCE(SUM(mp.nombre), 0) AS nb_medecins_prives
        FROM medecins_prives_stats mp
        WHERE mp.code_iso IS NOT NULL
        GROUP BY mp.code_iso
      )
      SELECT
        c.code_iso,
        c.nom,
        c.population_rgph_2024,
        c.code_province,
        c.code_region,
        COALESCE(pu.nb_medecins_publics, 0) AS nb_medecins_publics,
        COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_prives,
        COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_total,
        ROUND(
          (
            COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0)
          ) * 10000.0 / NULLIF(c.population_rgph_2024, 0),
          2
        ) AS densite_medecins_totale
      FROM communes c
      LEFT JOIN public_stats pu
        ON TRIM(c.code_iso) = TRIM(pu.code_iso)
      LEFT JOIN prive_stats pr
        ON TRIM(c.code_iso) = TRIM(pr.code_iso)
      ORDER BY c.nom;
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/densite-medical-commune :", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;