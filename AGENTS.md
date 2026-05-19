# Filebucket

## Git workflow
- Create and work in new branch for every new feature.
- When done implementing, commit and merge with the main branch.
- Always pull main branch to check for changes before pushing to it.
- Use `git pull --rebase` first, if there are conflicts, then use `git pull` and resolve them.


## Product Scope
- Personal-first hosted file-and-note vault.
- Login required; no public signup for MVP.
- Markdown notes are the primary content.
- Files are supporting media and attachments, especially images/audio/video.
- Folders are the main organization model; tags are secondary filters.
- Opening an item should immediately show its content.
- Use soft delete with trash/restore.
- Prioritize filename/title search before full-text note search.
- Keep collaboration, sharing, comments, backlinks, teams, and block-editor features out of scope unless explicitly requested.

## Tech Stack
- Next.js App Router for UI, route handlers, and server actions.
- TypeScript, Tailwind CSS, and shadcn-style UI primitives.
- Auth.js/NextAuth for authentication.
- Prisma with PostgreSQL for relational data.
- Supabase PostgreSQL is the intended hosted database.
- Cloudflare R2 is the intended media blob store.
- Vercel is the intended app host.

## Project Structure
- `app/`: routes, layouts, route handlers, and server actions.
- `app/page.tsx`: current authenticated home/dashboard screen.
- `app/login/`: custom login page and login/logout server actions.
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
- There is no `npm test` script yet; add one only when introducing a test framework.

## Environment
- Required for app/runtime work:
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `AUTH_URL`
  - `FILEBUCKET_ADMIN_EMAIL`
  - `FILEBUCKET_ADMIN_PASSWORD`
- Future R2 variables should stay out of scope until media upload work starts:
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
- For normal code changes, run `npm run lint`.
- For auth, database, route, or build-sensitive changes, also run `npm run build`.
- For Prisma schema changes, run `npm run prisma:generate`.
- Run migrations and seed only when a real `DATABASE_URL` is configured.
