const express = require("express");
const cors = require("cors");

const regionsRouter = require("./routes/regions");
const provincesRouter = require("./routes/provinces");
const communesRouter = require("./routes/communes");
const etablissementsRouter = require("./routes/etablissements");
const pharmaciesRouter = require("./routes/pharmacies");
const medecinsRouter = require("./routes/medecins");

const app = express();
const PORT = 3000;

// ✅ middleware
app.use(cors());
app.use(express.json());

// ✅ routes API
app.use("/api/regions", regionsRouter);
app.use("/api/provinces", provincesRouter);
app.use("/api/communes", communesRouter);
app.use("/api/etablissements", etablissementsRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/medecins", medecinsRouter);

// ✅ test route (optionnel mais utile)
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});