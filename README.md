# Filebucket

Filebucket is a personal, self-hosted file-and-note vault. It provides an Obsidian-inspired, distraction-free workbench UI in Next.js to organize notes, folders, and media assets in a single secure vault.

## Key Features

- **Mixed Vault Browser**: View and organize folders, notes, and media assets in a unified sidebar tree with drag-and-drop support.
- **Rendered Markdown Editor**: A smooth WYSIWYG editing experience (powered by Milkdown/Crepe) featuring automatic background autosaving.
- **Media Asset Management**: Upload photos, videos, and documents. Preview media in-app or link them directly inside your Markdown notes.
- **Tagging & Filtering**: Assign optional tags to notes and filter the browser views instantly by tag combination or name search.
- **Soft Trash Cascade**: Safety-first deletion where notes, media, and folders can be soft-deleted, inspected read-only, and fully restored.
- **Portable ZIP Export**: Download your entire vault structure as a ZIP archive. Filebucket references inside Markdown files are automatically rewritten to relative file paths.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (hosted on Supabase) via Prisma ORM
- **Blob Store**: Cloudflare R2 (S3-compatible API client)
- **Auth**: Auth.js / NextAuth (Credentials Provider)
- **Styling & Components**: Tailwind CSS & shadcn-style primitives
- **Tests**: Vitest & JSDOM

## Quick Start

### 1. Configure Environment
Create a `.env` file in the project root using the template below:

```bash
# Relational DB
DATABASE_URL="postgresql://..."

# Auth.js configs
AUTH_SECRET="your-32-char-random-secret"
AUTH_URL="http://localhost:3000"

# Initial admin credentials
FILEBUCKET_ADMIN_EMAIL="admin@filebucket.local"
FILEBUCKET_ADMIN_PASSWORD="secure-password"

# Cloudflare R2 Blob Storage (for media uploads)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="filebucket-vaults"
R2_PUBLIC_BASE_URL="https://cdn.example.com"
```

### 2. Install & Initialise
Install dependencies, generate the Prisma client, apply local migrations, and seed the default admin account:

```bash
# Install dependencies
npm install

# Setup database & seed admin
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Run the App
Launch the local Next.js development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in using your seeded admin credentials.

## Available Commands

- `npm run dev`: Starts local Next.js development server.
- `npm run build`: Compiles production build and validates types.
- `npm run start`: Serves a compiled production build.
- `npm run lint`: Runs ESLint check.
- `npm run test`: Runs the Vitest test suite.
- `npm run test:watch`: Runs Vitest in interactive watch mode.
