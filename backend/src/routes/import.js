const express = require("express");
const multer = require("multer");
const { parseCsv } = require("../services/csvParser");
const { mapCsvRecords } = require("../services/aiMapper");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) return cb(new Error("Only .csv files are accepted."));
    cb(null, true);
  },
});

/**
 * POST /api/import
 * Accepts a multipart/form-data upload with field name "file".
 * Parses the CSV, runs it through the AI mapper, returns structured JSON.
 */
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Expected form field 'file'." });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const rawRows = parseCsv(csvText);

    const result = await mapCsvRecords(rawRows);

    return res.json({
      success: true,
      totalInput: result.totalInput,
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
      records: result.records,
      skipped: result.skipped,
      failedBatches: result.failedBatches,
    });
  } catch (err) {
    console.error("Import failed:", err);
    return res.status(500).json({ error: err.message || "Import failed." });
  }
});

module.exports = router;
