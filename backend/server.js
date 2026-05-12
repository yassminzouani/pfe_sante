const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const regionsRouter = require("./routes/regions");
const provincesRouter = require("./routes/provinces");
const communesRouter = require("./routes/communes");
const etablissementsRouter = require("./routes/etablissements");
const pharmaciesRouter = require("./routes/pharmacies");
const medecinsRouter = require("./routes/medecins");
const medecinsPrivesRouter = require("./routes/medecinsPrives");
const densiteMedicalRegionRoutes = require("./routes/densite_medical_region");
const densiteMedicalCommuneRoutes = require("./routes/densite_medical_commune");
const cliniquesRouter = require("./routes/cliniques");
const comparaisonAccessibiliteRoutes = require("./routes/comparaisonAccessibilite");
const cabinetsPrivesRoutes = require("./routes/cabinetsPrives");
const analyseAccessibiliteRoutes = require("./routes/analyseAccessibilite");

//  Auth
const authRouter = require("./routes/auth");

const app = express();
const PORT = 3000;

// 🛡 Sécurité
app.use(helmet());

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// 🔐 Route auth
app.use("/api/auth", authRouter);

// 🌍 Routes API
app.use("/api/regions", regionsRouter);
app.use("/api/provinces", provincesRouter);
app.use("/api/communes", communesRouter);
app.use("/api/etablissements", etablissementsRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/medecins", medecinsRouter);
app.use("/api/medecins-prives", medecinsPrivesRouter);
app.use("/api/densite-medical-region", densiteMedicalRegionRoutes);
app.use("/api/densite-medical-commune", densiteMedicalCommuneRoutes);
app.use("/api/cabinets", cabinetsPrivesRoutes);
app.use("/api/cliniques", cliniquesRouter);
app.use("/api/comparaison-accessibilite", comparaisonAccessibiliteRoutes);
app.use("/api/analyse-accessibilite", analyseAccessibiliteRoutes);
app.get("/", (req, res) => {

  res.send("API running 🚀");
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});