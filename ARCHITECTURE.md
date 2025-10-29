# Admin Evaluation Dashboard

A lean Next.js (App Router) + TypeScript application that lets authenticated admins review prompts and media from CSVs/local sample_images, trigger multi-agent evaluations, and view persisted results from MongoDB.

## How it works

- Admin auth via username/password stored in environment variables.
- Ingestion reads the provided CSV (prompts) and creates `images` docs, deriving media type and dimensions (for images). The media files are served locally via a media proxy.
- Admin dashboard lists entries with filters/sorting and an Evaluate button. Evaluation runs a simple multi-agent pipeline and stores the result under `evaluations`.
- Latest evaluation per item is shown inline.


## How to extended the base repo
  - `src/services/ingest.ts`: Add new data sources, expand normalization (users/brands), dedupe rules, validations
  - `src/services/images.ts`: Extend aggregation (facets, pagination, search), add projections for new UI fields
  - `src/services/evaluate.ts` + `src/lib/agents.ts`: Add agents, tweak weights/thresholds, tune timeouts and fallbacks
  - `src/app/api/*/*.route.ts` + `route.ts`: Keep handlers thin; re-export pattern preserves Next.js routing
  - `src/components/Badge.tsx`, `src/components/ScoreBadge.tsx`, `src/components/Navbar.tsx`: Grow reusable UI primitives
  - `src/types/index.ts`: Single source of truth for DTOs; add fields safely for both UI and APIs
  - `src/config/index.ts`: Centralize environment-derived constants and toggles
  - `src/app/admin/*`: Add subroutes (items/[id], evaluations, settings) without touching core logic

## Data Model (MongoDB)

- `images` collection
  - `imagePath` (string) relative path like `sample_images/old_radio.jpg`
  - `prompt` (string)
  - `model` (string) LLM model name from CSV
  - `channel` (string)
  - `userId` (string)
  - `brandId` (string)
  - `timeStamp` (ISO string)
  - `mediaType` ("image"|"video")
  - `width`/`height` (optional, for images)
  - Indices: `{ timeStamp: -1 }`

- `evaluations` collection
  - `imageId` (string) reference to `images._id`
  - `sizeCompliance` (0-100)
  - `subjectAdherence` (0-100)
  - `creativity` (0-100)
  - `moodConsistency` (0-100)
  - `endScore` (0-100)
  - `createdAt` (ISO string)
  - Indices: `{ imageId: 1, createdAt: -1 }`

- `users` collection (normalized)
  - `userId` (string, unique)
  - `userName` (string)
  - `userRole` (string, optional)
  - Indices: `{ userId: 1, unique: true }`

- `brands` collection (normalized)
  - `brandId` (string, unique)
  - `brandName` (string)
  - `brandDescription`, `style`, `brandVision`, `brandVoice`, `colors` (strings, optional)
  - Indices: `{ brandId: 1, unique: true }`

- Admins
  - For simplicity, admin credentials are provided via env vars (`ADMIN_USER`, `ADMIN_PASS`). JWT is used to store a session cookie `admin_token`.

## Multi-Agent Orchestration

- Agent A — Size compliance
  - Agent roles: Ensures generated media meets expected size constraints; prefers square 1024×1024 for images.
  - Orchestration: Reads dimensions via `image-size`; runs with a short timeout and falls back to 50 on error/timeout; videos default to 50.
  - Scoring formula: Similarity-to-target mapped to 0–100. For images: `1 - min(1, (|w-1024|+|h-1024|)/(1024+1024))`, scaled to 0–100 and rounded. Videos → 50.

- Agent B — Subject adherence
  - Agent roles: Checks that media content aligns with the core prompt subject(s).
  - Orchestration: Tokenizes prompt and filename, computes normalized keyword overlap; short timeout with fallback 50.
  - Scoring formula: Overlap ratio × 100. Prompt tokens built by lowercasing, splitting on non-letters, removing stopwords `["a","an","the","and","or","of","to","in","on","for","with"]`; filename tokens from basename (without extension) using same rules. Score = `100 * |prompt∩file| / max(1, |prompt|)`.

- Agent C — Creativity
  - Agent roles: Estimates novelty/expressiveness of the prompt.
  - Orchestration: Analyzes prompt length, punctuation density, curated adjective presence; short timeout with fallback 50.
  - Scoring formula (weights sum to 1): `0.4*lenScore + 0.3*punctScore + 0.3*adjScore` where:
    - `lenScore = clamp(promptWords/25, 0, 1)`
    - `punctScore = clamp(punctCount/6, 0, 1)` counts of `[,.:;!?]`
    - `adjScore = clamp(adjHits/3, 0, 1)` using adjectives list `["vivid","cinematic","surreal","whimsical","moody","ethereal","gritty","dramatic","playful","minimalist"]`
    - Final score = above × 100 (rounded).

- Agent D — Mood consistency
  - Agent roles: Verifies that tone/mood in the prompt is represented.
  - Orchestration: Detects mood words and variety; short timeout with fallback 50.
  - Scoring formula: Mood presence ratio × 100 with diminishing returns for variety. Mood lexicon: `["happy","joyful","serene","calm","dramatic","dark","melancholic","hopeful","tense","mysterious","romantic","nostalgic","energetic"]`. Score = `min(1, hits/3) * 100`.

- Aggregation
  - Agent roles: Combines criteria into a single score the UI can sort by.
  - Orchestration: `evaluateImageById` runs agents (parallel where possible), collects results, persists to `evaluations`, UI shows latest.
  - Scoring formula: Deterministic weighted average — `endScore = 0.25*size + 0.35*subject + 0.20*creativity + 0.20*mood` (weights tunable).

## Trade-offs

- Heuristics vs LLM agents
  - Current: Heuristic agents (size/subject/creativity/mood) with deterministic rules.
  - Pros: Fast, local, reproducible; zero API cost; easy to unit test.
  - Cons: Less nuanced than LLMs; may underfit complex prompts/visual semantics.
  - Future: Optional LLM-based agents or hybrid approach (heuristics as guardrails + LLM for edge cases), with caching and batching.

- Auth simplicity vs ecosystem
  - Current: Cookie-based JWT; credentials via env; middleware guard.
  - Pros: Minimal deps; easy local setup; straightforward.
  - Cons: No user management/SSO; rotation and auditing are manual.
  - Future: NextAuth with Google OAuth, roles/permissions, token rotation.

- Media serving
  - Current: Local file proxy route (`/api/media?path=…`).
  - Pros: Works offline; simple; no external infra.
  - Cons: Not scalable; no CDN; limited caching; path coupling.
  - Future: Object storage (S3/GCS) + signed URLs + CDN; background ingest.

- Filtering/sorting strategy
  - Current: `$lookup` aggregation + simple query params; client can re-sort by score.
  - Pros: Lean; good enough for small datasets; easy to extend in pipeline.
  - Cons: No pagination cursors; could be heavy for large data.
  - Future: Server-side pagination, compound indexes, text search, materialized facets.

- MongoDB models vs validation
  - Current: Native driver without ODM; TypeScript types in `@/types`; unique indexes; no JSON Schema yet.
  - Pros: Lean/fast; fewer abstractions; easier to reason about queries.
  - Cons: No runtime schema enforcement; potential drift if inputs not validated.
  - Future: Add collection validators (JSON Schema) and Zod validation in API routes; keep types unified in `@/types`.

## Local Setup

1) Install dependencies
   - `npm install`

2) MongoDB (Docker Compose)
   - Start services: `docker compose up -d`
   - MongoDB URI (default): `mongodb://localhost:27017`
   - Mongo Express: http://localhost:8081 (login: admin/admin)

3) Env
   - Copy `.env.example` to `.env`
   - Adjust `MONGODB_URI`, `MONGODB_DB`, `ADMIN_USER`, `ADMIN_PASS`, `JWT_SECRET`

4) Dev server
   - `npm run dev`
   - Open http://localhost:3000

5) Ingest data
   - Login with your admin credentials
   - Click "Ingest CSV" on the Admin page
   - This reads `Test-repo-data-assignment - prompts.csv` and populates `images`

6) Evaluate
   - On any item, click "Evaluate" to run agents and persist results
   - Sorting by score shows best/worst entries

## Extending

- Add Google OAuth via NextAuth for teams
- More agents (brand safety, logo detection, face detection, NSFW filters)
- Use `users.csv`, `brands.csv` to enrich details and filtering facets
- Batch evaluation queue + worker for throughput
- Caching per image hash
