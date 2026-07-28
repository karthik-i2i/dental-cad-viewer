# Dental CAD Viewer

Developer setup guide for the **Kallisio Stentra Design System** frontend — a React app for uploading dental scans, starting a processing run against a backend API, and inspecting generated CAD models in a 3D viewer.

---

## Project overview

This is a Vite + React single-page application. Users authenticate (demo login), upload Maxilla and Mandible scans, choose Stentra type and patient ID, then confirm to create a backend run. The Result Viewer polls run status, downloads stage artifacts, and supports Model Explorer selection, Retry (with optional numeric parameters), Replace, and ZIP download.

---

## Features

| Area | What it does |
|------|----------------|
| **Login / Register** | Demo client-side auth (any valid email/password); not a real identity provider |
| **Upload** | Maxilla + Mandible `.stl` / `.ply` upload (max 200 MB each), 3D preview, patient ID, Stentra type |
| **Create run** | `POST /runs` via multipart form data (local-dev or production payload — see [Environment variables](#environment-variables)) |
| **Result Viewer** | Polls `GET /runs/{run_id}`, downloads stage files, Model Explorer multi-select |
| **3D viewer** | Three.js viewer: rotate, zoom, pan, auto-rotate, preset views, reset |
| **Retry / Replace** | Resume from a pipeline step (`POST /runs/{run_id}/resume`); Retry can send editable numeric stage parameters |
| **Download** | ZIP of currently selected models |
| **Stage toasts** | Header notifications when new pipeline stages become available |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19 |
| Build / dev server | Vite 6 |
| 3D | Three.js |
| ZIP | JSZip |
| Tests | Vitest 3 + jsdom + Testing Library |
| Package manager | npm (`package-lock.json`) |

---

## Prerequisites

- **Node.js 24** — see [Recommended versions](#recommended-nodenpm-versions)
- **npm 11+** (bundled with Node 24)
- A running **backend API** that implements the run endpoints below (required for Upload → Result)

Optional: nvm, fnm, or Volta — run `nvm use` (reads `.nvmrc`) after cloning.

---

## Recommended Node/npm versions

This project supports **one** development runtime: **Node.js 24**.

| Item | Value |
|------|--------|
| **Official runtime** | **Node.js 24** (Active LTS) |
| **npm** | **11+** (ships with Node 24) |
| `.nvmrc` | `24` |
| `package.json` `engines` | `"node": "^24.0.0"`, `"npm": ">=11.0.0"` |

Use the npm that comes with Node 24. Do not pin an older npm (for example npm 10) via Corepack.

```bash
nvm use          # or: nvm install 24
node -v          # expect v24.x.x
npm -v           # expect 11.x
```

---

## Installation

```bash
git clone <repository-url>
cd dental-cad-viewer
npm install
```

Copy the example env file and adjust if needed:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.development

# macOS / Linux
cp .env.example .env.development
```

Vite loads `.env.development` automatically in `npm start` / `npm run dev`.

---

## Environment variables

Defined in `.env.example` and read from `src/config/env.js`. Only `VITE_`-prefixed variables are exposed to the client.

| Variable | Required | Default (if unset) | Description |
|----------|----------|--------------------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Backend origin (no trailing slash). Used by `src/api/client.js`. |
| `VITE_USE_LOCAL_DEV_PIPELINE` | No | **`false`** (Production Mode) | Explicit opt-in. When `true`, `createRun()` uploads fixed files from `public/dev/` instead of user scans. When unset or `false`, uses the production upload payload (`maxilla` / `mandible`). |

**Local Development Mode** is intended **only** for developers on machines **without** the required AI license. Client deployments and licensed developer machines should leave `VITE_USE_LOCAL_DEV_PIPELINE` unset or set it to `false`.

**Important:** If the variable is omitted, the app uses **Production Mode** (real Maxilla/Mandible uploads). You must explicitly set `VITE_USE_LOCAL_DEV_PIPELINE=true` to use the bundled `public/dev/` sample files.

Example `.env.development` (licensed / client-like — production create-run path):

```env
VITE_API_BASE_URL=http://localhost:8000
```

Example for an **unlicensed** developer machine (opt-in Local Development Mode):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_LOCAL_DEV_PIPELINE=true
```

---

## Backend requirements

The frontend expects an HTTP API at `VITE_API_BASE_URL`. Primary contracts (see `src/api/runs.js`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/runs` | Create a run (multipart). Local-dev fields: `reoriented_mandible`, `reoriented_maxilla`, `reoriented_boundary_zip`, `patient_id`, `stentra_type`. Production fields: `maxilla`, `mandible`, `patient_id`, `stentra_type`. |
| `GET` | `/runs/{run_id}` | Poll status (`status`, `current_step`, `files[]` with `name`, `download_url`, optional `parameters`). |
| `POST` | `/runs/{run_id}/resume` | Retry / Replace (`from_step`, optional files, optional numeric parameter fields). |
| `GET` | file `download_url` | Download a generated artifact (blob). |

Without a reachable backend, login/upload UI still load, but **Confirm & Process** / polling will fail.

Local-dev pipeline assets (when enabled):

- `public/dev/su31626_step_01_reoriented_mandible.ply`
- `public/dev/su31626_step_01_reoriented_maxilla.ply`
- `public/dev/su31626_reoriented_boundaries.zip`

---

## Running locally

```bash
npm start
# equivalent:
npm run dev
```

- Dev server: **http://localhost:3000** (`vite.config.js`)
- Browser opens automatically when supported (`server.open: true`)

Flow:

1. Open the app → **Login** (demo: any email with `@` + any password) or **Register**.
2. **Upload** Maxilla and Mandible, enter patient ID, select Stentra type → **Confirm & Process**.
3. **Result Viewer** polls the run, reveals stages in Model Explorer, and loads selected models in the 3D viewer.

---

## Running with Docker

These instructions package **only the frontend** as a production static build served by nginx. The FastAPI backend is not included; run it separately on the host (default `http://localhost:8000`) if you need API calls to succeed.

Prerequisites: [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2.

### Build the image

From the `dental-cad-viewer` directory:

```bash
docker build -t dental-cad-viewer:local .
```

Optional build-time Vite variables (baked into the JS bundle). Defaults are production-safe (`VITE_USE_LOCAL_DEV_PIPELINE=false`):

```bash
docker build -t dental-cad-viewer:local \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  --build-arg VITE_USE_LOCAL_DEV_PIPELINE=false \
  .
```

Unlicensed developers who need the local-dev sample upload path can pass `--build-arg VITE_USE_LOCAL_DEV_PIPELINE=true`.

### Run the container

```bash
docker run --rm -p 3000:80 dental-cad-viewer:local
```

Open **http://localhost:3000** in your browser.  
Port mapping: host `3000` → container nginx on `80`.

### Docker Compose

```bash
# Build (if needed) and start in the foreground
docker compose up --build

# Or start detached
docker compose up --build -d
```

Open **http://localhost:3000**.

Stop and remove the compose stack:

```bash
docker compose down
```

Compose reads optional env vars for image **build args** (`VITE_API_BASE_URL`, `VITE_USE_LOCAL_DEV_PIPELINE`). Defaults leave Local Development Mode **off**. Example (explicit production path):

```bash
# Windows (PowerShell)
$env:VITE_API_BASE_URL="http://localhost:8000"
$env:VITE_USE_LOCAL_DEV_PIPELINE="false"
docker compose up --build

# macOS / Linux
VITE_API_BASE_URL=http://localhost:8000 \
VITE_USE_LOCAL_DEV_PIPELINE=false \
docker compose up --build
```

To opt in to Local Development Mode for an unlicensed machine, set `VITE_USE_LOCAL_DEV_PIPELINE=true` before `docker compose up --build`.

---

## Available npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `vite` | Start dev server (port 3000) |
| `npm run dev` | `vite` | Same as `start` |
| `npm run build` | `vite build` | Production build → `dist/` |
| `npm run preview` | `vite preview` | Serve `dist/` locally (port 3000) |
| `npm test` | `vitest` | Interactive Vitest watch mode |
| `npm run test:ci` | `vitest run` | Single CI test run |
| `npm run test:coverage` | `vitest run --coverage` | Tests + V8 coverage report |
| `npm run lint` | `eslint .` | Lint JS/JSX (quality rules) |
| `npm run lint:fix` | `eslint . --fix` | Auto-fix safe ESLint issues |
| `npm run format` | `prettier --write .` | Format with Prettier |
| `npm run format:check` | `prettier --check .` | Check formatting without writing |

ESLint covers code quality (React, hooks, unused vars). Prettier covers formatting. They are intentionally separate.

---

## Running tests

```bash
# One-shot (CI-style)
npm run test:ci

# Watch mode
npm test

# Coverage (output under coverage/)
npm run test:coverage
```

Tests live under `src/components/ResultViewer/__tests__/` (file parsing, artifact eligibility, resume selection, retry parameters). Setup: `src/test/setup.js`.

---

## Building for production

```bash
npm run build
npm run preview
```

Output directory: **`dist/`**. Preview serves the build at http://localhost:3000.

Ensure production env values are set at **build** time — Vite inlines `import.meta.env` during `vite build`. Set `VITE_API_BASE_URL` to the client API origin. Leave `VITE_USE_LOCAL_DEV_PIPELINE` unset or `false` for client builds (Production Mode is the default).

---

## High-level application workflow

```
Login / Register (demo)
        ↓
Upload (Maxilla + Mandible + patient_id + stentra_type)
        ↓
POST /runs  →  run_id
        ↓
Result Viewer
  ├─ poll GET /runs/{run_id} every ~2s
  ├─ download eligible files → Model Explorer
  ├─ select models → 3D viewer
  ├─ Retry / Replace → POST /runs/{run_id}/resume
  └─ Download ZIP of selection
```

App step state is owned by `src/App.jsx`: `login` → `register` | `upload` → `result`.

---

## Project structure

```
dental-cad-viewer/
├── index.html                 # Vite HTML entry
├── package.json
├── package-lock.json
├── vite.config.js             # Vite + Vitest config
├── .env.example               # Documented env template
├── public/
│   └── dev/                   # Fixed files for local-dev createRun pipeline
└── src/
    ├── main.jsx               # React bootstrap
    ├── App.jsx                # Step routing + shared upload draft
    ├── api/
    │   ├── client.js          # apiUrl + request helper
    │   └── runs.js            # createRun, getRun, resumeRun, fetchRunFile
    ├── config/
    │   └── env.js             # API_BASE_URL, USE_LOCAL_DEV_PIPELINE
    ├── test/
    │   └── setup.js           # Vitest setup
    └── components/
        ├── Login/             # Demo login
        ├── Register/          # Demo register
        ├── Upload/            # Scan upload workflow
        ├── ResultViewer/      # Polling, explorer, retry/replace, download
        ├── ReplaceDialog/     # Replace file UI
        └── STLViewer/         # Three.js STL/PLY viewer
```

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `npm start` fails / engine warning | Use Node 24 (`nvm use` / `node -v` should be `v24.x`). |
| Confirm & Process fails / network errors | Backend running? `VITE_API_BASE_URL` correct (no trailing slash)? Browser Network tab. |
| Uploaded scans ignored by the API | Local Development Mode may be enabled. Unset `VITE_USE_LOCAL_DEV_PIPELINE` or set it to `false`, then restart the dev server / rebuild. |
| Empty Result Viewer / no models | Run still processing? Polling errors? Backend returning `files[]`? |
| Port 3000 in use | Stop the other process, or change `server.port` in `vite.config.js`. |
| Tests fail after pull | `npm install` then `npm run test:ci`. |
| Env changes not applied | Restart Vite after editing `.env*`. Rebuild for production (`npm run build`). |

---

## Common developer commands

```bash
npm install              # install deps from package-lock.json
npm start                # dev server → http://localhost:3000
npm run lint             # ESLint quality checks
npm run lint:fix         # ESLint auto-fix (safe fixes only)
npm run format           # Prettier write
npm run test:ci          # run all unit tests once
npm run build            # production bundle → dist/
```

---

## Continuous integration

Every **push** and **pull request** runs GitHub Actions (`.github/workflows/ci.yml`) on **Node 24**:

1. `npm install`
2. `npm run lint`
3. `npm run test:ci`
4. `npm run build`

There is no deploy or release automation in CI.

---

## License & clinical use

Licensed under the [MIT License](./LICENSE).

This application is intended for clinical radiation-stent planning workflows. Ensure compliance with applicable privacy and medical-device regulations (for example HIPAA where relevant) and your institution’s review process before using with patient data.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding standards, and pull request expectations.

Quick checklist before a PR: `npm run lint`, `npm run test:ci`, and `npm run build` (same checks as CI).

---

## Additional documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) — contributor guide
- [LICENSE](./LICENSE) — MIT License
