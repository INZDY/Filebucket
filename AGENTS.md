# Filebucket

**MVP Status: Completed & Fully Tested (June 2026)**

## Git workflow

- Create a new branch for every new feature or implementation slice.
- Keep `main` stable and merge feature branches back into `main` when done.
- Before merging or pushing, update from `main` with `git pull --rebase origin main`.
- If rebase conflicts happen, resolve them, stage the fixes, then run `git rebase --continue`.
- Do not commit `.env` or other secrets.

## Milestone Execution Workflow

- Use `PLAN.md` as the source of truth for milestone order, scope, and status.
- Start each implementation cycle by reading `PLAN.md`, `CONTEXT.md`, this file, `git status --short`, the current branch, and the latest commit.
- If the current milestone has uncommitted changes, verify and commit them before starting another milestone.
- When starting a new milestone, create a dedicated `feature/<milestone-name>` branch unless already on the correct feature branch.
- Implement only the next incomplete milestone from `PLAN.md`; keep edits scoped to that milestone.
- Update the milestone status in `PLAN.md` after implementation.
- Verify according to the Verification section below.
- Commit each verified milestone with a concise milestone message.
- Continue to the next milestone after a successful commit unless a stop condition applies.
- Stop and ask for action if secrets/config are missing, verification fails without a clear fix, browser/manual smoke testing is required, destructive or data-risking work is needed, or scope would expand beyond `PLAN.md` or this file.

## Product Scope

- Personal-first hosted file-and-note vault.
- Login required; no public signup for MVP.
- Markdown notes are the primary content.
- Media assets are first-class vault content and note references. Avoid generic "file" language when behavior depends on Folder, Note, or Media Asset.
- Folders are the main organization model; tags are secondary filters.
- Opening an item should immediately show its content.
- Use soft delete with trash/restore.
- Prioritize filename/title search before full-text note search.
- Keep collaboration, sharing, comments, backlinks, teams, and block-editor features out of scope unless explicitly requested.

## Tech Stack

- Next.js App Router for UI, route handlers, and server actions.
- TypeScript, Tailwind CSS, shadcn-style UI primitives, and Milkdown/Crepe for rendered Markdown editing.
- Auth.js/NextAuth for authentication.
- Prisma with PostgreSQL for relational data.
- Supabase PostgreSQL is the intended hosted database.
- Cloudflare R2 is the intended media blob store.
- Vercel is the intended app host.

## Project Structure

- `app/`: routes, layouts, route handlers, and server actions.
- `app/page.tsx`: current authenticated home/dashboard screen.
- `app/folders/`: folder workflow server actions.
- `app/login/`: custom login page and login/logout server actions.
- `app/media/`: media asset workflow server actions.
- `app/notes/`: note workflow server actions and editor components.
- `app/tags/`: tag workflow server actions.
- `app/vault/`: vault shell layout components such as resizable panes.
- `app/api/auth/[...nextauth]/route.ts`: Auth.js route handler.
- `components/ui/`: reusable shadcn-style UI primitives.
- `lib/`: shared helpers such as auth/session wrappers, Prisma client, and utilities.
- `prisma/schema.prisma`: database schema.
- `prisma/migrations/`: checked-in Prisma migrations.
- `prisma/seed.mjs`: admin-user seed script.
- `types/`: local TypeScript module augmentation.

## Commands

- Use npm with the checked-in `package-lock.json`.
- `npm run dev`: start local Next.js development server.
- `npm run build`: production build and type/build validation.
- `npm run start`: serve a production build.
- `npm run lint`: run ESLint.
- `npm run prisma:generate`: generate Prisma Client.
- `npm run prisma:migrate`: run Prisma migrations locally.
- `npm run prisma:seed`: seed the configured admin user.
- `npm run test`: run unit and integration tests with Vitest.
- `npm run test:watch`: run Vitest in watch mode.

## Environment

- Required for app/runtime work:
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `AUTH_URL`
  - `FILEBUCKET_ADMIN_EMAIL`
  - `FILEBUCKET_ADMIN_PASSWORD`
- R2 variables stay out of scope until real media upload work. UI-only media integration can proceed without them; presigned uploads must stop if R2 config is missing:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_BASE_URL`

## Coding Style

- Use TypeScript, React function components, and strict typing.
- Prefer the `@/` import alias for local imports.
- Keep shadcn-style primitive filenames lowercase, for example `components/ui/button.tsx`.
- Use two-space indentation, semicolons, and double quotes.
- Build styling with Tailwind utilities.
- Use `cn()` from `lib/utils.ts` for conditional class merging.
- Keep edits scoped; avoid unrelated refactors.

## Auth And Data Notes

- Use `auth()`, `signIn()`, and `signOut()` from `@/auth`.
- Use `getSession()` or `requireSession()` from `lib/auth.ts` inside app code.
- Credentials login uses hashed passwords stored on `User.passwordHash`.
- Auth.js Credentials sessions are JWT-based; relational app data remains in PostgreSQL through Prisma.
- Use the shared Prisma client from `lib/prisma.ts`.
- Run Prisma validation/generation after schema changes.

## Verification

- During active development, prefer `npm run lint` as the default check.
- Run `npm run build` before merging a feature branch or after auth, database, route, config, or dependency changes.
- Stop the dev server before running `npm run build`; build rewrites `.next` and can make the active dev server serve stale CSS.
- After a build, restart `npm run dev` from a clean dev session before browser testing.
- After frontend workspace changes, verify with the in-app browser when a local dev server is available. If manual verification is required from the user, provide a concise smoke-test checklist.
- For Prisma schema changes, run `npm run prisma:generate`.
- Run migrations and seed only when a real `DATABASE_URL` is configured.
