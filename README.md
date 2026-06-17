# 🗃️ Filebucket

<p align="center">
  <strong>A private, self-hosted note and file vault designed for a quiet, distraction-free markdown experience.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Prisma-7.8-indigo?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind">
  <img src="https://img.shields.io/badge/Vitest-4.1-green?style=flat-square&logo=vitest" alt="Vitest">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

Filebucket is an Obsidian-inspired, personal web application that combines rich markdown note editing, nested folder structures, and direct media integration in one secure vault. It features a polished glassmorphism UI, fluid tactile transitions, and client-side heavy lifting (like ZIP manga extraction) to provide a premium, self-contained desktop and mobile workspace.

---

## 🌟 Core Philosophy

1. **Self-Hosted Privacy**: Your data belongs to you. Vault files stay private on your database and secure object storage (Cloudflare R2/S3) with zero public read requirements.
2. **Quiet & Distraction-Free**: Clean typography (Outfit & Inter), glassmorphism, responsive active-click scaling, and fluid sliding drawers keep the visual noise to a minimum.
3. **Browser-Heavy Processing**: Whenever possible, compute is offloaded to the browser. Parsing, Markdown parsing, and ZIP manga page extraction occur locally inside the user's browser, keeping backend server costs and resource consumption near zero.

---

## 🛠️ Feature Walkthrough

### 📁 Unified Vault Browser
*   **Mixed Tree Explorer**: View folders, nested folders, notes, and media assets in a cohesive sidebar tree rather than separate panes.
*   **Natural Sorting**: Implements natural alphanumeric sorting (`f2` sorts before `f10`) case-insensitively, keeping sequential series structured properly.
*   **Drag-and-Drop Move**: Move notes, assets, or entire directory trees dynamically with real-time drop highlights.
*   **Desktop & Mobile Adaptability**: Includes desktop sidebar resizing and a mobile sliding drawer for narrow viewports.

### ✍️ WYSIWYG Markdown Editor
*   **Milkdown/Crepe Editor**: Single-rendered live-editing view supporting titles, headings, task lists, code blocks, tables, blockquotes, and inline links.
*   **Autocomplete Tags**: Note header tag selector with inline search and auto-complete dropdown.
*   **Intelligent Autosave**: Saves notes automatically 1.5 seconds after you pause typing, with subtle status indicators protecting pending or failed saves on close.

### 📖 PWA Standalone Mode & Tachiyomi-style Reader
*   **Installable PWA**: Configured with responsive hydration registering a custom service worker (`sw.js`). Includes static asset caching via Stale-While-Revalidate proxying and Network-First API fallback.
*   **Integrated Manga Reader**: Fullscreen overlay supporting:
    *   *Webtoon Mode*: Continuous, lazy-loaded vertical scrolling.
    *   *Paged Mode*: Horizontal page flips supporting Left-to-Right (LTR) and Right-to-Left (RTL) reading with keyboard and chevron navigation.
*   **Client-Side ZIP/CBZ Decompression**: Direct decompression of comic book archives (`jszip` in the browser), sorting images alphanumerically and filtering out system metadata files (e.g. `__MACOSX`, `.DS_Store`) with zero backend server overhead.

### 🔒 Hardened Media Security & Delivery
*   **Private Bucket Protocol**: Media assets are never public. Direct R2 public links are disabled.
*   **Presigned Redirect Delivery**: Server action `/api/media?key=...` checks session auth, generates a short-lived presigned R2/S3 URL, and redirects (307) the client browser.
*   **HTTP Range Request Support**: Video and audio seeking works natively over presigned redirect links.

### ♻️ Soft Trash Cascade & Permanent Delete
*   **Trash Unification**: Soft-deleted notes, media, and folders are consolidated into a dedicated Trash list where they can be inspected in read-only tabs.
*   **Restore Cascade**: Restoring a folder restores all child descendants unless they were individually trashed beforehand.
*   **Permanent Purging**: Fully cleans database metadata and deletes physical file blobs from Cloudflare R2/S3.

### 📦 Portable ZIP Export
*   **Metadata Manifest**: Generates a standard ZIP download preserving directory structures, rendering notes as clean Markdown files, and packaging a `manifest.json` with note IDs, tags, and attachment maps.
*   **Path Rewriting**: Rewrites note image references to relative exported paths so the folder remains readable offline in any markdown client.

---

## 💻 Tech Stack

*   **Framework**: Next.js 15 (App Router, Server Actions)
*   **Database**: PostgreSQL via Prisma ORM (`@prisma/adapter-pg` for serverless-ready connection pools)
*   **Object Store**: Cloudflare R2 (S3-compatible API client)
*   **Authentication**: NextAuth.js / Auth.js (OAuth Google/GitHub & Credentials Providers, restricted to single-user admin in production)
*   **Styling**: Tailwind CSS, lucide-react icons, custom micro-animations
*   **Testing**: Vitest & JSDOM

---

## 🚀 Quick Start Guide

### 1. Configure Environment variables
Create a `.env` file in the project root:

```bash
# Relational DB Connection
DATABASE_URL="postgresql://..."

# Auth.js configurations
AUTH_SECRET="your-32-char-random-secret"
AUTH_URL="http://localhost:3000"

# Initial admin credentials (credentials login disabled in production)
FILEBUCKET_ADMIN_EMAIL="admin@filebucket.local"
FILEBUCKET_ADMIN_PASSWORD="secure-password"

# Google / GitHub OAuth (for production single-user admin authentication)
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"

# Cloudflare R2 Blob Storage (Private Bucket)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="filebucket-vaults"
```

### 2. Install & Initialise
Install dependencies, generate the Prisma client, apply local migrations, and seed the default admin account:

```bash
# Install NPM dependencies
npm install

# Setup database & seed admin
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Setup Storage CORS Rules
To allow client-side ZIP/CBZ extraction, you must configure CORS on your Cloudflare R2 bucket to allow your application's origin domain. For detailed instructions, refer to [docs/storage-configuration.md](docs/storage-configuration.md).

### 4. Run the App
Launch the local Next.js development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## 🧪 Available Commands

*   `npm run dev`: Starts local Next.js development server.
*   `npm run build`: Compiles production build and validates types.
*   `npm run start`: Serves a compiled production build.
*   `npm run lint`: Runs ESLint check.
*   `npm run test`: Runs the Vitest test suite.
*   `npm run test:watch`: Runs Vitest in interactive watch mode.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
