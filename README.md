# 🗃️ Filebucket

<p align="center">
  <strong>A private, self-hosted note and file vault designed for a quiet, distraction-free markdown experience.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Prisma-7.8-indigo?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind">
  <img src="https://img.shields.io/badge/Vitest-4.1-green?style=flat-square&logo=vitest" alt="Vitest">
</p>

Filebucket is an Obsidian-inspired personal web vault combining markdown editing, folder structures, and direct media integration in one secure interface. It features a polished glassmorphism UI, tactile micro-animations, and client-side archive reader utilities.

---

## 🌟 Core Philosophy

1. **Self-Hosted Privacy**: All vault files stay private on your database and S3/R2 storage with zero public read access.
2. **Quiet & Clean**: Translucent glassmorphism, clean typography (Outfit & Inter), and interactive click scaling keep visual noise to a minimum.
3. **Browser-Heavy Processing**: Heavy operations like markdown parsing and ZIP archive decompression are handled client-side to keep server resource usage minimal.

---

## 🛠️ Feature Walkthrough

### 📁 Unified Vault Browser
*   **Mixed Tree Explorer**: View folders, notes, and media in a unified sidebar tree with resizable desktop panels and sliding mobile drawers.
*   **Natural Sorting**: Natural alphanumeric sorting (`page_2.png` before `page_10.png`) case-insensitively.
*   **Drag-and-Drop Move**: Move folders, notes, and attachments dynamically with drop highlights.

### ✍️ WYSIWYG Markdown Editor
*   **Milkdown/Crepe Editor**: Single-rendered editing surface supporting headings, task checklists, tables, blockquotes, and code blocks.
*   **Metadata Tag Selector**: Assign notes tags with inline autocomplete.
*   **Idle Autosave**: Automatically saves note revisions 1.5 seconds after editing pauses.

### 📖 PWA Standalone Mode & Tachiyomi-style Reader
*   **Installable PWA**: Responsive hydration registering a custom service worker (`sw.js`) with static asset caching and network-first API fallbacks.
*   **Manga Reader Overlay**: Fullscreen reader supporting LTR/RTL horizontal paging and continuous vertical Webtoon layouts.
*   **Client-Side Archive Extraction**: Browser-local ZIP/CBZ extraction, natural alphanumeric page sorting, and system metadata filtering.

### 🔒 Hardened Media Security & Delivery
*   **Private Bucket Protocol**: R2/S3 public access remains disabled.
*   **Presigned Redirects**: Frontend requests route via `/api/media?key=...`, authorizing sessions before redirecting to short-lived presigned URLs.
*   **Range Request Support**: Natively supports video and audio seeking over signed links.

### ♻️ Soft Trash Cascade & Permanent Delete
*   **Trash Unification**: Soft-deleted items gather in a Trash explorer for read-only preview and folder-restore cascades.
*   **Permanent Purging**: Irreversibly deletes database records and file storage blobs.

### 📦 Portable ZIP Export
*   **Metadata Manifest**: Exports active folders/notes with a `manifest.json` catalog.
*   **Path Rewriting**: Automatically rewrites media embeds to relative relative paths for offline markdown client compatibility.

---

## 💻 Tech Stack

*   **Framework**: Next.js 15 (App Router, Server Actions)
*   **Database**: PostgreSQL via Prisma ORM
*   **Object Store**: Cloudflare R2 / AWS S3 client
*   **Authentication**: Auth.js / NextAuth (Credentials & OAuth Providers)
*   **Styling**: Tailwind CSS & lucide-react
*   **Testing**: Vitest & JSDOM

---

## 🚀 Quick Start Guide

### 1. Configure Environment
Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://..."

AUTH_SECRET="your-32-char-random-secret"
AUTH_URL="http://localhost:3000"

FILEBUCKET_ADMIN_EMAIL="admin@filebucket.local"
FILEBUCKET_ADMIN_PASSWORD="secure-password"

# Optional OAuth Configuration
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"

# Cloudflare R2 / S3 Blob Storage
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="filebucket-vaults"
```

### 2. Install & Initialise
Install dependencies, generate the Prisma client, and seed the default admin account:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Setup CORS Rules
To allow client-side ZIP/CBZ decompression in the browser, configure CORS on your R2/S3 bucket to allow your application's origin domain. See [docs/storage-configuration.md](docs/storage-configuration.md).

### 4. Run the App
Launch the local development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## 🧪 Available Commands

*   `npm run dev`: Starts local Next.js development server.
*   `npm run build`: Compiles production build.
*   `npm run start`: Serves a compiled production build.
*   `npm run lint`: Runs ESLint checks.
*   `npm run test`: Runs the Vitest test suite.
*   `npm run test:watch`: Runs Vitest in interactive watch mode.
