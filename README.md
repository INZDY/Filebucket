# Filebucket

A self-hosted private file vault with three note-taking modes. Metadata lives in PostgreSQL; blobs live in your own Cloudflare R2 bucket. Buckets stay private — media is served through session-authorized, short-lived presigned URLs.

The vault reserves three system folders, one per note mode:

- `Notes/` — long-form Markdown notes (Obsidian mode)
- `Quick Notes/` — quick note cards and checklists (Google Keep mode)
- `Chat Channels/` — chronological message streams (Discord mode)

Everything outside them is general file storage.

## Features

### Files

- Unified vault browser with nested folders, natural alphanumeric sorting, and drag-and-drop moves
- Folder contents view with live image and video thumbnails
- Cover extraction at upload time for manga (ZIP/CBZ), EPUB, and PDF files
- Configurable card aspect ratio: landscape, portrait, or square
- Bulk selection with bulk move, move to trash, and ZIP download
- Soft-delete trash with restore and cascading permanent delete

### Obsidian Notes

- Rendered Markdown editing surface (Tiptap) with headings, lists, interactive task checkboxes, tables, and code blocks
- Tags, global search, and a heading-based note outline
- Note export as `.md` and export of whole folders or chat channels
- Autosave with a configurable delay

### Quick Notes

- Keep-style card grid with pinning and card colors
- Mixed text and checklist editing, with checklist items keeping their original order
- Markdown rendering inside cards, height-clamped with a bottom fade

### Chat Channels

- Chronological streams with timestamps and sender headers
- Inline image attachments and single-row file attachment cards
- Message deletion and per-channel export to a Markdown transcript

### Readers

- Manga Reader: paged LTR/RTL layouts, continuous webtoon scrolling, and in-browser ZIP/CBZ decompression
- Book Reader: EPUB and plain-text files with reading themes, typography settings, and a table of contents
- Reading progress and reader settings sync across devices via the database

### Platform

- Installable PWA with standalone mode and offline caching
- Storage quota display against a configurable limit
- Media range requests, so video and audio seeking works over signed links

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions), React 19
- **Database**: PostgreSQL via Prisma 7
- **Storage**: Cloudflare R2 with presigned URLs (other S3 providers are not supported yet)
- **Auth**: Auth.js (credentials plus optional Google and GitHub OAuth)
- **Editor**: Tiptap
- **Media**: Video.js, epub.js, pdf.js, JSZip
- **Styling**: Tailwind CSS 3
- **Testing**: Vitest and JSDOM

## Quick Start

### 1. Configure environment

Copy `.env.example` to `.env` and fill in the values.

Required:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Long random string used by Auth.js |
| `AUTH_URL` | Public URL of the app, e.g. `http://localhost:3000` |
| `FILEBUCKET_ADMIN_EMAIL` | Email for the seeded admin account |
| `FILEBUCKET_ADMIN_PASSWORD` | Password for the seeded admin account |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Bucket access key |
| `R2_SECRET_ACCESS_KEY` | Bucket secret key |
| `R2_BUCKET_NAME` | Bucket name for vault blobs |

Optional: `R2_PUBLIC_BASE_URL` for a public CDN domain, and `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` or `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` for OAuth sign-in.

### 2. Install and initialize

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Configure bucket CORS

Client-side ZIP/CBZ decompression requires CORS rules on the bucket. See [docs/storage-configuration.md](docs/storage-configuration.md).

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded admin account.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Serve a production build |
| `npm run test` | Run the Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Apply database migrations |
| `npm run prisma:seed` | Seed the admin account |