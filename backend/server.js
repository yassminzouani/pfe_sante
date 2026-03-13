const express = require("express");
const cors = require("cors");
const path = require("path");

const regionsRouter = require("./routes/regions");
const provincesRouter = require("./routes/provinces");
const communesRouter = require("./routes/communes");
const etablissementsRouter = require("./routes/etablissements");
const pharmaciesRouter = require("./routes/pharmacies");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// servir le frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// routes API
app.use("/api/regions", regionsRouter);
app.use("/api/provinces", provincesRouter);
app.use("/api/communes", communesRouter);
app.use("/api/etablissements", etablissementsRouter);
app.use("/api/pharmacies", pharmaciesRouter); 

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});