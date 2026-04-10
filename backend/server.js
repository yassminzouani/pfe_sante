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

// 🔐 Auth
const authRouter = require("./routes/auth");

const app = express();
const PORT = 3000;

// 🛡 Sécurité
app.use(helmet());

app.use(cors({
  origin: "http://localhost:5173", // ton frontend React
}));

app.use(express.json());

// 🚫 Anti brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

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

app.get("/", (req, res) => {
  res.send("API running 🚀");
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});