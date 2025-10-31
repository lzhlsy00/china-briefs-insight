# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the Vite client; route screens under `src/pages/`, shared UI in `src/components/`, contexts in `src/contexts/`, and logic helpers in `src/hooks/` + `src/lib/`.
- Entry wiring stays in `src/main.tsx` and `src/App.tsx`; keep integration clients (e.g., Supabase) under `src/integrations/`.
- Place static assets in `public/`; keep build artifacts in `dist/` but out of Git.
- Supabase migrations and edge functions live in `supabase/`; coordinate backend changes there to avoid client bundling.

## Build, Test, and Development Commands
- `npm run dev` starts the hot-reloading dev server at http://localhost:5173.
- `npm run build` emits a production bundle; use `npm run build:dev` when you need debuggable artifacts for CDN or Supabase introspection.
- `npm run preview` serves the latest build for smoke tests before shipping.
- `npm run lint` enforces ESLint + Tailwind conventions; fix or disable rules intentionally with inline comments.

## Coding Style & Naming Conventions
- Stick to functional React with TypeScript, two-space indentation, and ES module imports.
- Prefer the `@/` alias for cross-directory imports (e.g., `import useLocale from '@/hooks/useLocale'`).
- Components in PascalCase, hooks and utilities in camelCase, static assets in kebab-case.
- Compose styles with Tailwind classes; extract shared variants with `class-variance-authority` when reuse emerges.

## Testing Guidelines
- Vitest with React Testing Library is the canonical stack; colocate files as `Component.test.tsx` near the source or under `src/__tests__/`.
- Automated coverage is optional today, but document manual smoke checks for `/`, `/pricing`, and auth flows in your PR.
- When adding tests, run them with `npx vitest --run` or via IDE integration and commit deterministic snapshots only.

## Supabase & Configuration Tips
- Initialize clients in `src/integrations/` and mirror env keys across `.env` files and `supabase/config.toml`.
- Deploy edge functions from `supabase/functions/` using the Supabase CLI; include any migration notes in the PR body.
- Never hardcode secrets; rely on Vite `import.meta.env` and document required variables.

## Commit & Pull Request Guidelines
- Follow the short date prefix found in history (e.g., `10.13 – adjust pricing copy`).
- PRs should summarize user-facing impact, list Supabase/config changes, attach relevant UI screenshots, and confirm `npm run lint` plus manual preview checks.
- Link Notion tasks or tracking issues when available, and request review once CI and linting are green.
