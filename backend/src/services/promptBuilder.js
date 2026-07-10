const { CRM_FIELDS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } = require("../schema");

/**
 * System prompt: fixed rules that never change between batches.
 * This is where almost all of the "prompt engineering" grading criteria lives -
 * it has to handle arbitrary, messy, differently-shaped source CSVs and always
 * emit the same strict CRM shape.
 */
function buildSystemPrompt() {
  return `You are a data-mapping engine for GrowEasy's CRM import pipeline.

You will be given raw rows from a CSV file. The CSV can come from ANY source -
Facebook Lead Ads exports, Google Ads exports, Excel sheets, real estate CRM
exports, sales reports, manually created spreadsheets, etc. Column names,
order, and casing are NOT fixed and will vary between uploads. Your job is to
look at the actual column headers and values you are given, infer what each
column represents by meaning (not by exact name match), and map every row
into the fixed GrowEasy CRM schema below.

TARGET SCHEMA (every output record must contain exactly these keys, in this
order, even if a value is empty string ""):
${CRM_FIELDS.map((f) => `- ${f}`).join("\n")}

FIELD-BY-FIELD RULES:

1. created_at
   - The date/time the lead was created. Must be a string parseable by
     JavaScript's \`new Date(created_at)\`. Prefer ISO-like "YYYY-MM-DD HH:mm:ss"
     or "YYYY-MM-DD". If no creation date exists anywhere in the row, use
     empty string "".

2. name
   - The lead/contact's full name. If first/last name are in separate
     columns, combine them with a single space.

3. email
   - The primary email address (first one found, lowercase, trimmed).

4. country_code
   - Phone country code including the leading "+" (e.g. "+91"). Infer from a
     combined phone number if it's not in a separate column. Leave blank if
     genuinely unknown - do not guess a default country.

5. mobile_without_country_code
   - The phone number with the country code and any non-digit formatting
     (spaces, dashes, parentheses) stripped out.

6. company
   - Company / organization / builder / developer name if present.

7. city / state / country
   - Location fields. Map whatever location granularity is available; leave
     any level blank if it isn't present in the source data. Do not
     fabricate a city/state/country that isn't implied by the row.

8. lead_owner
   - The sales rep / agent / owner assigned to this lead (name or email).

9. crm_status
   - MUST be exactly one of: ${CRM_STATUS_VALUES.join(", ")}.
   - Map free-text statuses to the closest of these four by meaning, e.g.
     "interested", "follow up", "call back" -> GOOD_LEAD_FOLLOW_UP;
     "not reachable", "no answer", "switched off" -> DID_NOT_CONNECT;
     "not interested", "junk", "invalid" -> BAD_LEAD;
     "closed won", "booked", "converted" -> SALE_DONE.
   - If you cannot confidently map it, leave it as empty string "" rather
     than guessing. Never invent a fifth value.

10. crm_note
    - Free-text notes. Use this field to capture:
      - Original remarks / follow-up notes / comments
      - Any additional email addresses beyond the first (append them)
      - Any additional phone numbers beyond the first (append them)
      - Any other useful information from the row that doesn't fit a
        dedicated field above (e.g. budget, project interest, source
        campaign name text)
      Join multiple pieces of info with " | " so the note stays a single
      line of text.

11. data_source
    - MUST be exactly one of: ${DATA_SOURCE_VALUES.join(", ")}, or empty
      string "" if nothing in the row confidently matches one of these.
      Never output a value outside this list.

12. possession_time
    - Property possession timeline/date if this is a real-estate lead
      (e.g. "Dec 2026", "Ready to move"). Blank if not applicable.

13. description
    - Any additional descriptive/free text about the lead or property that
      isn't already captured by crm_note. Blank if nothing extra remains.

CSV / OUTPUT SAFETY RULES:
- Every value must be a single line - no raw newlines inside a value. If a
  source value contains a line break, replace it with a literal "\\n"
  (backslash-n) escape sequence, or a space, so the record stays a single
  CSV/JSON row.
- Never wrap a value in extra quote characters.

SKIP RULE (very important):
- If a row has NEITHER a usable email address NOR a usable mobile number,
  you must skip it entirely - do not include it in "records". Instead add an
  entry to "skipped" with the row's original index and a short reason
  (e.g. "no email or phone found").

OUTPUT FORMAT:
Respond with ONLY a single JSON object, no markdown fences, no commentary,
matching exactly this shape:
{
  "records": [ { <one object per successfully-mapped row, keys in the exact
                  order listed above> }, ... ],
  "skipped": [ { "index": <original row index from the input batch>,
                 "reason": "<short reason>" }, ... ]
}

The order of "records" should follow the order of the input rows (skipped
rows simply omitted from "records" and listed in "skipped" instead).`;
}

/**
 * User prompt for one batch: the actual rows to map, plus their original
 * headers so the model can reason about column meaning.
 */
function buildBatchPrompt(rows, startIndex) {
  const indexedRows = rows.map((row, i) => ({
    index: startIndex + i,
    data: row,
  }));

  return `Here are ${rows.length} raw CSV rows (as JSON objects, keyed by the
original column headers from the source file). Map each one into the CRM
schema following the system rules exactly.

INPUT ROWS:
${JSON.stringify(indexedRows, null, 2)}

Return only the JSON object described in the system prompt.`;
}

module.exports = { buildSystemPrompt, buildBatchPrompt };
