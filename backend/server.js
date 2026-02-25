const express = require("express");
const cors = require("cors");
require("dotenv").config();

const provincesRoute = require("./routes/provinces");
const communesRoute = require("./routes/communes");

const facilitiesRoute = require("./routes/facilities");
const regionsRoute = require("./routes/regions");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/facilities", facilitiesRoute);
app.use("/api/regions", regionsRoute);

app.use("/api/provinces", provincesRoute);
app.use("/api/communes", communesRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});