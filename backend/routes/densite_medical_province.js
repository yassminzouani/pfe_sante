const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      WITH public_stats AS (
        SELECT
          e.code_province,
          COALESCE(SUM(m.nombre), 0) AS nb_medecins_publics
        FROM etablissements e
        LEFT JOIN medecins m
          ON e.id = m.id_etablissement
        WHERE e.code_province IS NOT NULL
        GROUP BY e.code_province
      ),
      prive_stats AS (
        SELECT
          c.code_province,
          COALESCE(SUM(mp.nombre), 0) AS nb_medecins_prives
        FROM medecins_prives_stats mp
        JOIN communes c
          ON TRIM(mp.code_iso) = TRIM(c.code_iso)
        WHERE c.code_province IS NOT NULL
        GROUP BY c.code_province
      )
      SELECT
        p.code_province,
        p.nom,
        p.nom_arabe,
        p.superficie,
        p.population_rgph_2024,
        p.code_region,
        COALESCE(pu.nb_medecins_publics, 0) AS nb_medecins_publics,
        COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_prives,
        COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_total,
        ROUND(
          (
            COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0)
          ) * 10000.0 / NULLIF(p.population_rgph_2024, 0),
          2
        ) AS densite_medecins_totale
      FROM provinces p
      LEFT JOIN public_stats pu
        ON p.code_province = pu.code_province
      LEFT JOIN prive_stats pr
        ON p.code_province = pr.code_province
      ORDER BY p.nom;
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/densite-medical-province :", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;