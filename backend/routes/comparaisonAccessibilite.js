const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT
        code_iso,
        nom_commune,
        population_rgph_2024,
        code_province,
        code_region,

        nb_medecins_publics,
        nb_medecins_prives,
        nb_medecins_total,

        densite_10000,

        apl_1000,
        niveau_apl,

        sfca_1000,
        niveau_2sfca,

        gravitaire_1000,
        niveau_gravitaire,

        sans_medecin_commune,
        desert_medical_confirme,

        ST_AsGeoJSON(geometry)::json AS geometry

      FROM comparaison_accessibilite_communes
      WHERE geometry IS NOT NULL
      ORDER BY nom_commune;
    `;

    const result = await db.query(query);

    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: row.geometry,
        properties: {
          code_iso: row.code_iso,
          nom_commune: row.nom_commune,
          population_rgph_2024: row.population_rgph_2024,
          code_province: row.code_province,
          code_region: row.code_region,

          nb_medecins_publics: Number(row.nb_medecins_publics || 0),
          nb_medecins_prives: Number(row.nb_medecins_prives || 0),
          nb_medecins_total: Number(row.nb_medecins_total || 0),

          densite_10000: Number(row.densite_10000 || 0),

          apl_1000: Number(row.apl_1000 || 0),
          niveau_apl: row.niveau_apl,

          sfca_1000: Number(row.sfca_1000 || 0),
          niveau_2sfca: row.niveau_2sfca,

          gravitaire_1000: Number(row.gravitaire_1000 || 0),
          niveau_gravitaire: row.niveau_gravitaire,

          sans_medecin_commune: row.sans_medecin_commune,
          desert_medical_confirme: row.desert_medical_confirme,
        },
      })),
    };

    res.json(geojson);
  } catch (error) {
    console.error("Erreur GET /api/comparaison-accessibilite :", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;