const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      WITH region_mapping AS (
        SELECT *
        FROM (
          VALUES
            ('Béni Mellal-Khénifra', 'Région de Béni Mellal-Khénifra'),
            ('Casablanca-Settat', 'Région de Casablanca-Settat'),
            ('Eddakhla-Oued Eddahab', 'Région de Dakhla-Oued Ed-Dahab'),
            ('Drâa-Tafilalet', 'Région de Drâa-Tafilalet'),
            ('Fès-Meknès', 'Région de Fès-Meknès'),
            ('Guelmim-Oued Noun', 'Région de Guelmim-Oued Noun'),
            ('Oriental', 'Région de l''Oriental'),
            ('Laayoune-Sakia El Hamra', 'Région de Laâyoune-Sakia El Hamra'),
            ('Marrakech-Safi', 'Région de Marrakech-Safi'),
            ('Rabat-Salé-Kénitra', 'Région de Rabat-Salé-Kénitra'),
            ('Souss-Massa', 'Région de Souss-Massa'),
            ('Tanger-Tetouan-Al Hoceima', 'Région de Tanger-Tétouan-Al Hoceima')
        ) AS t(region_source, nom_region_normalise)
      ),
      public_stats AS (
        SELECT
          e.code_region,
          COALESCE(SUM(m.nombre), 0) AS nb_medecins_publics
        FROM etablissements e
        LEFT JOIN medecins m
          ON e.id = m.id_etablissement
        WHERE e.code_region IS NOT NULL
        GROUP BY e.code_region
      ),
      prive_stats AS (
        SELECT
          rm.nom_region_normalise,
          COALESCE(SUM(mp.nombre), 0) AS nb_medecins_prives
        FROM medecins_prives_stats mp
        LEFT JOIN region_mapping rm
          ON TRIM(mp.region) = rm.region_source
        GROUP BY rm.nom_region_normalise
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
        ON r.nom_region = pr.nom_region_normalise
      ORDER BY r.nom_region;
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/densite-medical-region :", error);
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;