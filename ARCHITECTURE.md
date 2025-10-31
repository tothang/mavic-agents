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

## Multi-Agent

- Agent A — Size compliance
  - Agent roles: Ensures generated media meets expected size constraints; prefers square 1024×1024 for images.
  - Orchestration: For videos, uses an LLM (LangChain `ChatOpenAI`) with a text prompt to rate adaptability to 1024×1024; for images, sends numeric dimensions to the LLM. On failure, falls back to a deterministic dimension heuristic. Short timeouts and clamped 0–100 scores.
  - Scoring: LLM returns strict JSON `{ score: 0-100 }`. Fallback heuristic computes closeness to 1024×1024.

  ```mermaid
  flowchart TD
    A[Input\nmediaType, absPath] -->|video| VLLM[LLM text scoring\nsize_compliance_video]
    A -->|image| DIM[Read dimensions]
    DIM --> ILLM[LLM text scoring\nsize_compliance]
    ILLM -->|ok| OUT1[Score 0-100]
    ILLM -->|fail| HEUR[Heuristic closeness to 1024x1024]
    VLLM -->|ok| OUT1
    VLLM -->|fail| DEF[Default 50]
    HEUR --> OUT1
    DEF --> OUT1
  ```

- Agent B — Subject adherence
  - Agent roles: Checks that the media content aligns with the core prompt subject(s) and brand guidelines.
  - Orchestration: Uses an LLM with brand context (name, description, vision, voice, colors, style). If the media is an image, first attempts a vision-enabled LLM call by sending the image (as data URL) with the prompt + brand; on failure, falls back to text-only LLM; finally, to a lightweight heuristic.
  - Scoring: LLM responds with `{ score: 0-100 }`. Heuristic fallback leverages brandName token overlap.

  ```mermaid
  flowchart TD
    BIN[Input\nprompt, brand, mediaType, absPath] -->|image| V1[Vision LLM\nsubject_adherence_image]
    BIN -->|not image or fail| T1[Text LLM\nsubject_adherence]
    V1 -->|ok| OUT2[Score 0-100]
    V1 -->|fail| T1
    T1 -->|ok| OUT2
    T1 -->|fail| H1[Heuristic brandName overlap]
    H1 --> OUT2
  ```

- Agent C — Creativity
  - Agent roles: Estimates the creativity/originality and evocative quality.
  - Orchestration: If the media is an image, attempts a vision LLM evaluation with the image and prompt; otherwise uses a text LLM. On failure, falls back to a deterministic heuristic (length/punctuation/adjectives).
  - Scoring: LLM returns `{ score: 0-100 }`; heuristic computes a weighted score and clamps to 0–100.

  ```mermaid
  flowchart TD
    CIN[Input\nprompt, mediaType, absPath] -->|image| V2[Vision LLM\ncreativity_image]
    CIN -->|not image or fail| T2[Text LLM\ncreativity]
    V2 -->|ok| OUT3[Score 0-100]
    V2 -->|fail| T2
    T2 -->|ok| OUT3
    T2 -->|fail| H2[Heuristic\nlen/punct/adj]
    H2 --> OUT3
  ```

- Agent D — Mood consistency
  - Agent roles: Verifies that the intended tone/mood is clearly and consistently represented.
  - Orchestration: If the media is an image, attempts a vision LLM evaluation with the image and prompt; otherwise uses a text LLM. On failure, falls back to a deterministic mood-word presence heuristic.
  - Scoring: LLM returns `{ score: 0-100 }`; heuristic uses mood lexicon counts with diminishing returns.

  ```mermaid
  flowchart TD
    MIN[Input\nprompt, mediaType, absPath] -->|image| V3[Vision LLM\nmood_consistency_image]
    MIN -->|not image or fail| T3[Text LLM\nmood_consistency]
    V3 -->|ok| OUT4[Score 0-100]
    V3 -->|fail| T3
    T3 -->|ok| OUT4
    T3 -->|fail| H3[Heuristic\nmood words]
    H3 --> OUT4
  ```

- Aggregation
  - Agent roles: Combines criteria into a single score the UI can sort by.
  - Orchestration: `evaluateImageById` runs agents in parallel with per-agent timeouts and fallbacks, collects results, persists to `evaluations`, UI shows latest.
  - Scoring formula: Deterministic weighted average — `endScore = 0.25*size + 0.35*subject + 0.20*creativity + 0.20*mood` (weights tunable).

  ```mermaid
  flowchart LR
    S1[Size] --> W[Weighted\nAggregation]
    S2[Subject] --> W
    S3[Creativity] --> W
    S4[Mood] --> W
    W --> E[endScore]
  ```

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
