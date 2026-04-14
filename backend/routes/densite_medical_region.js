const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      WITH public_stats AS (
        SELECT 
          e.code_region,
          COALESCE(SUM(m.nombre), 0) AS nb_medecins_publics
        FROM etablissements e
        LEFT JOIN medecins m
          ON e.id = m.id_etablissement
        GROUP BY e.code_region
      ),
      prive_stats AS (
        SELECT 
          mp.code_region,
          COALESCE(SUM(mp.nombre), 0) AS nb_medecins_prives
        FROM medecins_prives_stats mp
        GROUP BY mp.code_region
      )
      SELECT 
        r.code_region,
        r.nom_region,
        r.population_rgph_2024,
        COALESCE(pu.nb_medecins_publics, 0) AS nb_medecins_publics,
        COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_prives,
        COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0) AS nb_medecins_total,
        ROUND(
          (
            COALESCE(pu.nb_medecins_publics, 0) + COALESCE(pr.nb_medecins_prives, 0)
          ) * 10000.0 / NULLIF(r.population_rgph_2024, 0),
          2
        ) AS densite_medecins_totale
      FROM regions r
      LEFT JOIN public_stats pu
        ON r.code_region = pu.code_region
      LEFT JOIN prive_stats pr
        ON r.code_region = pr.code_region
      ORDER BY r.nom_region;
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/densite-medical-region :", error);
    res.status(500).json({
      error: "Erreur serveur lors du calcul de la densité médicale régionale"
    });
  }
});

module.exports = router;