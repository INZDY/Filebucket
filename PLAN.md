# Filebucket Plan & Roadmap

This plan details the completed milestones and the upcoming roadmap for the Filebucket project.

---

## Completed Milestones

### Milestone 1: Global Theme & Aesthetics Redesign
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Established the "Obsidian Glass" styling foundation, translucent glassmorphism, Outfit/Inter typography, and subtle micro-animations.

### Milestone 2: Split-Screen Login & Landing Page
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Implemented elegant feature landing panel on the left, and centered glassmorphic login card on the right.

### Milestone 3: Vault Browser Right-Click & Drag-and-Drop
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Custom right-click context menus for folders/notes/media rows, and visual highlights for drag-and-drop actions.

### Milestone 4: Note Editor Polish & Header Tag Pills
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Clean editor margins, and a Note Header tag selector with autocomplete.

### Milestone 5: PDF & TXT File Previews
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Integrated in-app iframe PDF rendering and raw TXT file streaming/display.

### Milestone 6: Hardening & Test Verification
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Established Vitest/JSDOM testing suites with 40+ tests.

### Milestone 7: UI Compaction, Trash Unification & Permanent Deletion
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** noteActionsMenu, sidebar creation toolbar, unified trash list, read-only trash previews, and permanent deletion with S3/R2 cleanups.

### Milestone 8: Serverless Database & Migration Setup
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Configured serverless-compatible database access via `@prisma/adapter-pg` and set up automated Prisma client generation in the build step.

### Milestone 9: Hardening Authentication & Session Safety
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Implemented single-user admin restrictions on Google/GitHub OAuth logins for production, disabling credentials login in production, and configured NextAuth with `trustHost` for serverless hosts.

### Milestone 10: Private Media Delivery & Storage Hardening
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Offloaded public R2 bucket requirements. Replaced direct public URLs with short-lived presigned download URLs served via the secure `/api/media?key=...` endpoint, adding support for range requests.

### Milestone 11: Production Deployment & Verification
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Verified the Next.js production build, connection pooling, and successfully ran the entire 62-test suite.

---

## Upcoming Roadmap (PWA & Tactile Manga Vault)

### Milestone 12: Progressive Web App (PWA) Manifest & Icons
*   **Goal:** Make the application installable as a standalone app with custom icons and basic manifest metadata.
*   **Tasks:**
    *   Generate a high-quality icon and store it in `/public/icon.png` (using the generate_image tool).
    *   Create a Web App Manifest (`manifest.json`) referencing standalone display, name, theme colors, and icons.
    *   Configure meta tags (viewport, theme color, Apple mobile web app status) in [layout.tsx](file:///C:/Users/Akina/repos/Filebucket/app/layout.tsx).
*   **Verification:** Verify the manifest and icons parse correctly via browser developer tools.

### Milestone 13: Service Worker & Hybrid Caching
*   **Goal:** Register a Service Worker that caches static assets for instant load and proxies dynamic requests network-first.
*   **Tasks:**
    *   Write a Service Worker script `/public/sw.js` with Stale-While-Revalidate caching for static files, and Network-First for API/Server Actions.
    *   Register the Service Worker client-side during the layout hydration process.
*   **Verification:** Turn off network connection (offline mock) and confirm UI assets still load instantly from cache, while API requests fail gracefully.

### Milestone 14: Subtle Tactile Response Animations
*   **Goal:** Implement lightweight micro-animations for button interactions and sidebar transitions.
*   **Tasks:**
    *   Add scaling styles (`active:scale-95 transition-transform duration-100`) to major interactive buttons (sidebar controls, workspace action triggers).
    *   Animate the mobile sidebar panel slide-in and backdrop fade using Tailwind transitions.
*   **Verification:** Tap buttons and verify scaling feedback; slide open mobile sidebar and check transition smoothness.

### Milestone 15: Folder-Based Manga Reader Overlay
*   **Goal:** Build a fullscreen overlay viewer for sequential folder image reading (Webtoon and Paged LTR/RTL layouts).
*   **Tasks:**
    *   Create a fullscreen Manga Reader overlay component overlaying the viewport.
    *   Support Webtoon mode (continuous vertical list) and Paged mode (Left-to-Right and Right-to-Left horizontal paging).
    *   Support paging zoom and navigation controls (taps, arrows, swipe).
*   **Verification:** Open an image in a folder containing multiple images, launch the reader, and verify sequential reading layout options and page turns.

### Milestone 16: Client-Side ZIP/CBZ Manga Extraction
*   **Goal:** Enable direct reading of ZIP/CBZ media archives client-side using `jszip`.
*   **Tasks:**
    *   Detect ZIP/CBZ file preview types and display a "Read Archive" button.
    *   Load and extract archive files client-side, filtering system metadata (`__MACOSX`, `.DS_Store`) and naturally sorting images alphanumerically via `compareAlphanumeric`.
*   **Verification:** Upload a CBZ/ZIP file of images, open it, and verify the reader displays pages in the correct alphabetical sequence.
