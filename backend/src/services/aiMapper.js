const { CRM_FIELDS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } = require("../schema");
const { buildSystemPrompt, buildBatchPrompt } = require("./promptBuilder");
const { callAi } = require("./aiProvider");
const { chunk, runWithConcurrency } = require("../utils/batching");

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "20", 10);
const BATCH_CONCURRENCY = parseInt(process.env.BATCH_CONCURRENCY || "3", 10);
const MAX_RETRIES = parseInt(process.env.BATCH_MAX_RETRIES || "2", 10);

/** Strips markdown code fences if the model added them despite instructions. */
function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

/** Coerces a single AI-returned record into the strict schema shape. */
function sanitizeRecord(raw) {
  const record = {};
  for (const field of CRM_FIELDS) {
    let value = raw[field];
    if (value === undefined || value === null) value = "";
    value = String(value).replace(/\r?\n/g, "\\n").trim();
    record[field] = value;
  }

  // Enforce enums server-side too - never trust the model blindly.
  if (!CRM_STATUS_VALUES.includes(record.crm_status)) record.crm_status = "";
  if (!DATA_SOURCE_VALUES.includes(record.data_source)) record.data_source = "";

  return record;
}

/**
 * Sends one batch of raw rows to the AI and returns validated
 * { records, skipped }. Retries on transport errors or malformed JSON.
 */
async function mapBatch(rows, startIndex) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildBatchPrompt(rows, startIndex);

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callAi(systemPrompt, userPrompt);
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);

      const records = Array.isArray(parsed.records) ? parsed.records.map(sanitizeRecord) : [];
      const skipped = Array.isArray(parsed.skipped) ? parsed.skipped : [];

      return { records, skipped, batchStartIndex: startIndex, error: null };
    } catch (err) {
      lastError = err;
      // brief backoff before retrying
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  // All retries exhausted - report the whole batch as failed rather than
  // silently dropping it, so the frontend can show it as an error, not a
  // false "skipped: no email/phone".
  return {
    records: [],
    skipped: rows.map((_, i) => ({
      index: startIndex + i,
      reason: `AI mapping failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message || "unknown error"}`,
    })),
    batchStartIndex: startIndex,
    error: lastError?.message || "unknown error",
  };
}

/**
 * Top-level entry point: takes all raw CSV rows, batches them, maps each
 * batch via the AI with bounded concurrency, and merges the results.
 */
async function mapCsvRecords(rawRows) {
  const batches = chunk(rawRows, BATCH_SIZE);

  const tasks = batches.map((batchRows, batchIdx) => async () =>
    mapBatch(batchRows, batchIdx * BATCH_SIZE)
  );

  const batchResults = await runWithConcurrency(tasks, BATCH_CONCURRENCY);

  const records = [];
  const skipped = [];
  const failedBatches = [];

  for (const result of batchResults) {
    records.push(...result.records);
    skipped.push(...result.skipped);
    if (result.error) failedBatches.push(result.batchStartIndex);
  }

  return {
    records,
    skipped,
    totalInput: rawRows.length,
    totalImported: records.length,
    totalSkipped: skipped.length,
    failedBatches,
  };
}

module.exports = { mapCsvRecords };
