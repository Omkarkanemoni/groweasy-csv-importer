# GrowEasy CSV Importer

An AI-powered importer that takes a CSV lead export from **any** source
(Facebook Lead Ads, Google Ads, an Excel sheet, a real-estate CRM export,
whatever) and maps it into GrowEasy's fixed 15-field CRM schema — without
anyone having to write per-source column-mapping code by hand.

## How it works

```
 ┌────────────┐   drag/drop CSV   ┌──────────────────┐
 │  Next.js   │ ───────────────▶ │  parse client-side │  (PapaParse, preview only)
 │  frontend  │                   │  → raw table       │
 └────────────┘                   └──────────────────┘
        │ user clicks "Confirm"
        ▼
 ┌────────────┐  POST /api/import  ┌──────────────────────────┐
 │  Express    │ ◀────────────────│  multipart file upload     │
 │  backend    │                   └──────────────────────────┘
 │            │  1. parse CSV (csv-parse)
 │            │  2. split rows into batches
 │            │  3. batch → LLM (system prompt encodes the CRM
 │            │     schema + all business rules)
 │            │  4. validate/sanitize the model's JSON output
 │            │  5. merge batches → { records, skipped }
 └────────────┘
        │ JSON response
        ▼
 frontend renders mapped-records table + imported/skipped counts
```

The entire "how do I map an unknown column layout" problem lives in one
place: [`backend/src/services/promptBuilder.js`](backend/src/services/promptBuilder.js).
That's the file to read (and to extend) first.

## Project structure

```
backend/
  server.js                     Express entrypoint
  src/
    schema.js                   Single source of truth for the CRM fields + enums
    routes/import.js            POST /api/import (multer upload → mapper)
    services/
      csvParser.js               CSV text -> array of row objects
      promptBuilder.js            System + per-batch prompts (the core prompt engineering)
      aiProvider.js                Thin LLM client wrapper (OpenAI wired; Gemini/Anthropic stubbed)
      aiMapper.js                  Batching, retries, validation, merges results
    utils/batching.js             chunk() + bounded-concurrency runner

frontend/
  app/
    page.tsx                     Upload → preview → confirm → results flow
    types.ts                     Shared CrmRecord / ImportResponse types
    components/
      FileDropzone.tsx            Drag-and-drop + click-to-browse upload
      DataTable.tsx                Reusable scrollable table (used for both previews)
      StepRail.tsx                 4-step progress indicator
```

## Running it locally

**Backend**
```bash
cd backend
npm install
cp .env.example .env
# edit .env and set OPENAI_API_KEY (or switch AI_PROVIDER and fill in that key)
npm run dev        # http://localhost:4000
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev         # http://localhost:3000
```

Open `http://localhost:3000`, drop in a CSV, review the raw preview, click
confirm, and the mapped/validated CRM table appears with import/skip counts.

## Design decisions worth knowing about

- **Two-step preview, not one big black box.** The raw table renders
  entirely client-side (PapaParse) before anything is sent to the backend —
  so the user can sanity-check the file was read correctly *before* burning
  AI calls on it.
- **Batching, not one-giant-prompt.** Rows are sent to the LLM in configurable
  batches (`BATCH_SIZE`, default 20) with bounded concurrency
  (`BATCH_CONCURRENCY`), so a 2,000-row CSV doesn't blow past context limits
  or hammer the provider with 2,000 parallel requests.
- **The AI is not trusted blindly.** `aiMapper.js` re-validates every
  returned record against the schema and re-checks the `crm_status` /
  `data_source` enums server-side — if the model ever hallucinates a value
  outside the allowed list, it gets reset to `""` rather than silently
  polluting the CRM.
- **Retries at the batch level.** If a batch's response is malformed JSON or
  the request errors, it's retried (`BATCH_MAX_RETRIES`, default 2) with a
  short backoff before that batch is reported as failed — a single bad batch
  no longer takes down the whole import.
- **Provider-swappable.** All LLM calls funnel through `aiProvider.js`.
  OpenAI is implemented; Gemini and Anthropic have the exact call shape
  stubbed in comments so switching is a ~10-line change, not a rewrite.

## Deploying

- **Frontend → Vercel**: point it at the `frontend/` directory, set
  `NEXT_PUBLIC_API_URL` to your deployed backend URL.
- **Backend → Railway / Render**: point it at the `backend/` directory,
  set `OPENAI_API_KEY` (and the other `.env.example` vars) in that
  platform's environment variable settings, expose `PORT`.

## Possible next steps

- Add streaming/progress updates (e.g. SSE) so the frontend can show
  "batch 3 of 12 mapped" instead of one spinner for the whole import.
- Add a lightweight test suite (`promptBuilder` output shape, `aiMapper`
  enum-sanitization, and the skip rule) with a mocked `aiProvider`.
- Dockerize both services with a single `docker-compose.yml` for one-command
  local spin-up.
- Add basic auth / rate limiting to `/api/import` before this goes anywhere
  near a public URL, since it currently accepts uploads from anyone who has
  the link.
