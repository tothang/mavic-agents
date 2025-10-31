# Admin Evaluation Dashboard

A lean Next.js + TypeScript admin app to review user-generated prompts and media, trigger multi-agent evaluations, and view persisted results from MongoDB.

## Quick Start

- Requirements
  - Docker (for MongoDB) or local MongoDB
  - Node 18+

- Bring up MongoDB with Docker
  - `docker compose up -d`
  - Mongo Express: http://localhost:8081 (user/pass: admin/admin)

- Configure env
  - `cp .env.example .env`
  - Defaults:
    - `MONGODB_URI=mongodb://localhost:27017`
    - `MONGODB_DB=admin_eval_db`
    - `ADMIN_USER=admin`
    - `ADMIN_PASS=admin`
    - `JWT_SECRET=secret`
    - `LLM_API_KEY=sk-proj-`

- Install & run
  - `npm install`
  - `npm run dev`
  - Open http://localhost:3000

## Login Credentials

- Username: `admin`
- Password: `admin`

Update these in `.env` for production use.

## What the system does

- Ingests items from `Test-repo-data-assignment - prompts.csv` and reads local media under `sample_images/`.
- Shows an Admin dashboard with items, channel filter, and sort by date/score.
- Serves thumbnails/videos via a local media proxy.
- Runs a deterministic multi-agent evaluation per item:
  - Size compliance (image dimensions heuristic)
  - Subject adherence (prompt vs. brands keywords)
  - Creativity (prompt features)
  - Mood consistency (mood word presence)
  - Aggregates into an end score (weighted average)
- Persists results in MongoDB (`images`, `evaluations` collections) and shows the latest evaluation per item.

## Typical flow

1) Start MongoDB (`docker compose up -d`) (If your MongoDB is running locally, skip this step).
2) `npm install && npm run dev`.
3) Login at http://localhost:3000 with `admin/admin`.
4) Click "Ingest CSV" (reads the CSV and populates `images`).
5) Click "Evaluate" per item to run agents and save results.
6) Sort by score to compare outputs.

## Demo Video
- https://www.loom.com/share/4a220893fe53460d8aa9d47fe23233d4

## Tech Stack

- Next.js (App Router), React, TypeScript
- MongoDB (with optional Mongo Express)
- Heuristic agents (no external LLMs)

## Notes

- Credentials and secrets are loaded from `.env`.
- Media proxy serves local files; do not expose publicly without hardening.
- See `ARCHITECTURE.md` for more detail.
