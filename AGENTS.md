# Repository Guidelines

## Project Structure & Module Organization
The Vite client lives in `src/`, with routed pages under `src/pages/`, shared UI in `src/components/`, contexts inside `src/contexts/`, and reusable logic distributed across `src/hooks/` and `src/lib/`. App entry wiring stays in `src/main.tsx` and `src/App.tsx`. Static assets belong in `public/`, while build artifacts are produced in `dist/` and kept out of Git. Supabase edge code and migrations reside under `supabase/`; route any database or edge updates through that directory to avoid leaking server logic into the client bundle.

## Build, Test, and Development Commands
Use `npm run dev` for the hot-reloading dev server at http://localhost:5173. Run `npm run build` for production bundles, or `npm run build:dev` when you need development-flavored artifacts for CDN or Supabase debugging. `npm run preview` serves the last build for smoke checks, and `npm run lint` applies the shared ESLint + Tailwind rules; expect pull requests to pass this before review.

## Coding Style & Naming Conventions
Write components with functional React and TypeScript, two-space indentation, and ES module syntax. Prefer the `@/` alias for imports that escape the current folder. Compose styling with Tailwind utilities; extract repeatable variants using `class-variance-authority` where needed. Name components in PascalCase (`PricingTable.tsx`), hooks and utilities in camelCase (`useLocale.ts`), and static assets in kebab-case.

## Testing Guidelines
Automated tests are not yet scaffolded. If you add coverage, colocate specs as `Component.test.tsx` next to the source or under `src/__tests__/`, using Vitest with React Testing Library. Until a suite exists, manually smoke-test key flows (`/`, `/pricing`, authentication) via `npm run preview` before merging.

## Supabase & Configuration Tips
Initialize the client in `src/integrations/` and keep environment variables in `.env` files aligned with `supabase/config.toml`. Deploy edge functions from `supabase/functions/` via the Supabase CLI after updating migrations, and document any required env keys in your PR description.

## Commit & Pull Request Guidelines
Follow the short date prefix used in history (e.g., `10.13 – adjust pricing copy`). Pull requests should summarize user-facing impact, call out Supabase or config changes, attach relevant UI screenshots, and confirm `npm run lint` plus manual smoke checks. Link Notion tasks or tracking issues whenever possible.
