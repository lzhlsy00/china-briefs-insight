# Repository Guidelines

## Project Structure & Module Organization
The Vite client lives under `src/`, with route-level screens collected in `src/pages/`, shared UI in `src/components/`, contexts in `src/contexts/`, and reusable hooks or helpers in `src/hooks/` and `src/lib/`. Keep `src/main.tsx` and `src/App.tsx` focused on wiring while integrations (Supabase, analytics, etc.) stay in `src/integrations/`. Static assets belong in `public/`; production bundles land in `dist/` but remain untracked. Supabase migrations and edge functions reside in `supabase/`, so coordinate schema changes there before merging client updates. Tests can sit beside their sources as `Component.test.tsx` or under `src/__tests__/` when they share fixtures.

## Build, Test, and Development Commands
- `npm run dev` launches the hot-reload server on http://localhost:5173.
- `npm run build` emits an optimized production bundle.
- `npm run build:dev` produces a debuggable bundle for CDN or Supabase inspection.
- `npm run preview` serves the latest build for local smoke tests.
- `npm run lint` runs ESLint with Tailwind plugins; fix or explicitly disable rules in-line.

## Coding Style & Naming Conventions
Author components with functional React + TypeScript, two-space indentation, and ES module imports. Prefer the `@/` alias for cross-directory imports (e.g., `import useLocale from '@/hooks/useLocale'`). Components use PascalCase, hooks/utilities camelCase, and static assets kebab-case. Compose UI with Tailwind classes; introduce `class-variance-authority` variants only when patterns recur. Rely on Prettier via ESLint to enforce formatting.

## Testing Guidelines
Vitest with React Testing Library is the default stack. When adding coverage, include deterministic snapshots only and run `npx vitest --run` (or `npm run test` if aliased) before pushing. Manual smoke checks for `/`, `/pricing`, and auth flows are required in PR notes. Document any gaps or flaky cases so reviewers understand remaining risk.

## Security & Configuration Tips
Initialize Supabase clients in `src/integrations/` and mirror env variables across `.env`, `.env.local`, and `supabase/config.toml`. Never hardcode secrets; use `import.meta.env` guards and document required keys in the PR body. Deploy edge functions from `supabase/functions/` via the Supabase CLI, and log migration steps whenever schema changes land.

## Commit & Pull Request Guidelines
Prefix commits with the short date observed in history (e.g., `10.13 – adjust pricing copy`) followed by a concise summary. Pull requests should describe user-facing impact, call out Supabase/config changes, attach relevant UI screenshots, and confirm `npm run lint` plus manual preview checks. Link Notion tasks or tracking issues when available, and request review only after CI succeeds.
