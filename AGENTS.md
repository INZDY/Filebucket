# Repository Guidelines

## Project Structure & Module Organization

This is a private Next.js App Router project for Filebucket. Application routes and layouts live in `app/`; the current home screen is `app/page.tsx`, with global styles in `app/globals.css`. Reusable UI primitives are in `components/ui/`, and shared helpers live in `lib/`, such as `lib/utils.ts`. Root configuration includes `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, and `components.json`.

No dedicated `tests/` or `public/` asset directory exists yet. Add them only when there is a concrete need, and keep assets referenced by Next.js conventions.

## Build, Test, and Development Commands

Use npm with the checked-in `package-lock.json`.

- `npm run dev`: starts the local Next.js development server.
- `npm run build`: creates a production build and catches type/build errors.
- `npm run start`: serves the production build after `npm run build`.
- `npm run lint`: runs ESLint over the repository.

There is currently no `npm test` script. Add one when introducing a test framework.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and strict typing. Prefer the `@/` import alias from `tsconfig.json` for local imports. Keep component filenames lowercase where they mirror the existing shadcn-style UI primitives, for example `components/ui/button.tsx`.

Follow the existing formatting style: two-space indentation, semicolons, double quotes, and trailing commas only where surrounding code uses them. Build class names with Tailwind CSS utilities, and use `cn()` from `lib/utils.ts` for conditional class merging.

## Testing Guidelines

When tests are added, place unit tests next to the code or under a clear `tests/` directory, and name files `*.test.ts` or `*.test.tsx`. Prefer focused tests for shared helpers, stateful UI behavior, and future file/note operations. Until a test runner exists, validate changes with `npm run lint` and `npm run build`.

## Commit & Pull Request Guidelines

This repository has no commits yet, so no historical commit convention is established. Use short imperative messages such as `Add vault sidebar layout` or `Fix note search filter`.

Pull requests should include a brief summary, validation steps run, and screenshots for UI changes. Link related issues or planning notes when available, and call out any new environment variables, storage assumptions, or migrations.

## Agent-Specific Instructions

Keep MVP work personal-first: hosted web app, login, Markdown notes as the primary content, folders first with tag filtering, direct item open behavior, trash/restore, and filename-first search. Avoid adding collaboration, sharing, backlinks, or block-editor features unless explicitly requested.
