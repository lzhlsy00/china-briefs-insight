# Repository Guidelines

## Project Structure & Module Organization
Runtime code lives in `src/`: `src/main.tsx` wires global providers, `src/App.tsx` composes layout, and `src/pages/` holds screen-level components. Shared UI and logic belong in `src/components/`, `src/contexts/`, `src/hooks/`, and `src/lib/`, while API and Supabase helpers stay inside `src/integrations/` so routes remain declarative. Assets ship from `public/`, build artifacts land in `dist/`, and Supabase schema, migrations, plus edge handlers are versioned under `supabase/`. Keep any new tests or story-style sandboxes adjacent to the feature file.

## Build, Test, and Development Commands
- `npm run dev`: Launches Vite on http://localhost:5173 with hot reload for manual flow checks.
- `npm run build`: Produces the optimized bundle used for `preview` and deployment sanity checks.
- `npm run preview`: Serves the last build locally; exercise onboarding, article detail, and saved-brief paths here before shipping.
- `npm run lint`: Runs ESLint configured for TypeScript, Tailwind, and shadcn utilities; resolve or explain any warnings.

## Coding Style & Naming Conventions
Author functional React + TypeScript components with two-space indentation, ES modules, and the `@/` alias to avoid deep relatives. Components/routes use PascalCase, hooks/utilities use camelCase, and Tailwind utility strings sit inline or in tiny local CSS files. Compose class names via `clsx` or `class-variance-authority`, and update `components.json` whenever a new shadcn primitive is installed.

## Testing Guidelines
There is no automated suite yet, so every pull request must manually verify onboarding, article detail, and saved-brief flows in both `npm run dev` and `npm run preview`. When adding coverage, pair Vitest with React Testing Library, name files `FeatureName.test.tsx`, colocate them with the component, and run them through `npx vitest --run`. Call out data dependencies and remaining gaps in the PR description.

## Commit & Pull Request Guidelines
Commits follow short-date prefixes from `git log` (e.g., `11.14-2 tighten newsletter copy`) and should remain single-purpose. Pull requests summarize user-visible impact, list the commands executed (lint, build, preview), include UI captures, document Supabase migrations or environment variable changes, and link the related Notion or GitHub issue. Ship schema updates and frontend changes in the same PR to keep reviewers aligned.

## Security & Configuration Tips
Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_NEWS_API_BASE_URL` inside `.env.local` and mirror them in hosting secrets. Version SQL in `supabase/migrations/` and deploy edge handlers from `supabase/functions/`, referencing them in the PR checklist. Never log credentials, wrap experiments behind `import.meta.env.DEV`, and run `npm run build` locally to verify nothing sensitive leaks into the bundle.
