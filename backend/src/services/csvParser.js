const { parse } = require("csv-parse/sync");

/**
 * Parses a raw CSV buffer/string into an array of plain objects keyed by
 * the file's own header row. We deliberately do NOT assume any fixed
 * column names here - whatever headers the file has become the object keys,
 * and the AI mapping step figures out what they mean.
 */
function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV file is empty.");
  }

  const records = parse(csvText, {
    columns: true, // use first row as keys
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // tolerate ragged rows from messy real-world exports
    bom: true,
  });

  if (records.length === 0) {
    throw new Error("No data rows found in CSV (only a header row, or file is empty).");
  }

  return records;
}

module.exports = { parseCsv };
