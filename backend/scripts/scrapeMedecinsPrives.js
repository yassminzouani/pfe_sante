const axios = require("axios");
const { parse } = require("csv-parse/sync");
const pool = require("../db");

const URL = "https://cartesanitaire.sante.gov.ma/ws/ws_prive_medecin_csv.ashx";

async function fetchData() {
  const response = await axios.get(URL, {
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://cartesanitaire.sante.gov.ma/dashboard/pages2/prive_medecin_2025.html",
      "Accept": "text/tab-separated-values,text/plain,text/csv,*/*",
      "Origin": "https://cartesanitaire.sante.gov.ma"
    }
  });

  return response.data;
}

function parseTSV(text) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "\t"
  });
}

async function insertRow(row) {
  const sql = `
    INSERT INTO medecins_prives_stats (
      code, cs, milieu, delegation, region, specialite, nombre
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (code, cs, milieu, delegation, region, specialite, annee)
    DO UPDATE SET
      nombre = EXCLUDED.nombre,
      updated_at = NOW()
  `;

  const values = [
    row.code,
    row.cs,
    row.milieu,
    row.delegation,
    row.region,
    row.type,
    parseInt(row.nombre || 0)
  ];

  await pool.query(sql, values);
}

async function main() {
  console.log("Récupération des données...");

  const raw = await fetchData();

  console.log("Parsing...");
  const rows = parseTSV(raw);

  console.log("Nombre de lignes:", rows.length);
  console.log("Exemple:", rows[0]);

  for (const row of rows) {
    await insertRow(row);
  }

  console.log("Import terminé ");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});