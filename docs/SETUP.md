# Local setup

This repository is intended to be implemented as a pnpm workspace with Node.js 24 LTS and Docker Compose. The handoff package does not contain application source yet.

## Prerequisites

- Node.js 24 LTS (pin exact patch in `.node-version`/tooling when repository is initialized).
- pnpm version pinned via `packageManager` in root `package.json`.
- Docker Engine and Docker Compose plugin.
- Git.
- A local `.env` based on `.env.example` (never commit it).

## First-run sequence (after implementation)

1. Clone the repository and inspect `README.md`, `AGENTS.md` and the current `AI_HANDOFF.md`.
2. Copy `.env.example` to `.env`; provide local-only secrets. Do not use production credentials locally.
3. Install the lockfile-pinned dependencies using `pnpm install --frozen-lockfile`.
4. Start local dependencies with the documented Compose profile (PostgreSQL 18, pg-boss shares PostgreSQL, ClamAV and local S3-compatible development storage if enabled).
5. Apply Drizzle migrations using the repository's migration script.
6. Seed synthetic demo organization/users/borrower/facility/documents only through an explicit seed command.
7. Run unit, integration and E2E tests.
8. Start Next.js and the worker using documented scripts.
9. Open the local URL and confirm the health/readiness routes.

## Safety

- Do not import real borrower/credit documents into development or preview by default.
- Do not put secrets in source control, client environment variables, browser storage or logs.
- The deployed environment must use Vultr Object Storage; local storage/MinIO is development only.
- The local parser and ClamAV services must run in isolated containers and never as privileged containers.
- Do not expose PostgreSQL, parser or scanner ports to the host/network unless a documented local-only reason exists.

Exact commands must be added to the implemented `package.json` and verified; do not invent scripts or claim these commands exist before implementation.
