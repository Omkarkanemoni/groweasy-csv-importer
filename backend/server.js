require("dotenv").config();
const express = require("express");
const cors = require("cors");
const importRouter = require("./src/routes/import");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", importRouter);

// Central error handler (catches multer errors etc. that reach here)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend running on http://localhost:${PORT}`);
});
