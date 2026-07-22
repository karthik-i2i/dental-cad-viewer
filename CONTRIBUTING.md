# Contributing

Thanks for helping improve this project. Keep changes focused and verify them locally before opening a pull request.

## Prerequisites

- **Node.js 24** (see `.nvmrc`)
- **npm 11+** (bundled with Node 24)

```bash
nvm use          # or: nvm install 24
node -v          # expect v24.x
npm -v           # expect 11.x
```

## Setup

```bash
npm install
npm start
```

The app runs at http://localhost:3000. See the [README](./README.md) for environment variables and backend requirements.

## Before opening a PR

All of the following must pass locally (and in CI):

```bash
npm run lint
npm run test:ci
npm run build
```

## Coding standards

This repository uses:

- **ESLint** — code quality (`eslint.config.js`)
- **Prettier** — formatting (`.prettierrc.json`)
- **EditorConfig** — basic editor defaults (`.editorconfig`)

Run `npm run lint` and `npm run format` as needed. Do not bypass formatting/lint for style debates — follow the project configs.

## Pull request expectations

- Keep PRs small and focused on one concern when practical
- Use clear commit messages that explain why the change exists
- Ensure GitHub Actions CI is green (lint, tests, build)
- Include a short summary of what changed and how you tested it

For bug reports, include reproduction steps, browser console output, and whether `VITE_USE_LOCAL_DEV_PIPELINE` is enabled.
