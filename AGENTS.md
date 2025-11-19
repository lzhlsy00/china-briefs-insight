# Repository Guidelines

## Project Structure & Module Organization
Runtime code sits in `src/`: `src/main.tsx` boots providers, `src/App.tsx` assembles layout, `src/pages/` holds screens, and `src/components/`, `src/contexts/`, `src/hooks/`, and `src/lib/` cover shared UI and state helpers. Keep API and Supabase clients inside `src/integrations/` so route files stay declarative. Assets remain in `public/`, build products land in `dist/`, and Supabase config, migrations, plus edge functions live under `supabase/`.

## Build, Test, and Development Commands
- `npm run dev` serves the app at http://localhost:5173 with hot reload.
- `npm run build` compiles the optimized bundle used for preview or deployment.
- `npm run preview` serves the last build locally for final smoke tests.
- `npm run lint` runs ESLint with Tailwind + TypeScript plugins; fix violations or explain intentional ignores in the PR.

## Coding Style & Naming Conventions
Author functional React + TypeScript components with two-space indentation, ES modules, and the `@/` alias instead of deep relative paths. Use PascalCase for components/routes, camelCase for hooks and utilities, and co-locate Tailwind utility strings or small CSS files with the component. Compose UI through Tailwind plus `clsx` or `class-variance-authority`, and update `components.json` whenever a new shadcn primitive is pulled in.

## Testing Guidelines
There is no automated suite; every PR must manually check onboarding, article detail, and saved-brief flows through `npm run dev` and `npm run preview`. When adding tests, adopt Vitest + React Testing Library, name files `FeatureName.test.tsx` next to the component, and execute via `npx vitest --run` until an npm script is added. Call out any remaining gaps or data dependencies directly in the PR description.

## Commit & Pull Request Guidelines
Match the repository’s short-date prefixes from `git log` (e.g., `11.14-2 tighten newsletter copy`) and keep each commit focused on a single change. Pull requests should summarize the user-visible impact, list the commands executed (`npm run lint`, `npm run preview`), attach UI captures, and describe Supabase migrations or new environment variables. Link the related Notion or GitHub issue, and ensure schema updates and frontend code land together.

## Security & Configuration Tips
Environment-aware clients read `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_NEWS_API_BASE_URL`; set them in `.env.local` and replicate them in hosting secrets before merging. Version SQL in `supabase/migrations/` and deploy edge handlers from `supabase/functions/`, referencing the change in the PR checklist. Avoid logging credentials, guard experiments with `import.meta.env.DEV`, and run `npm run build` locally to catch accidental exposure before shipping.
