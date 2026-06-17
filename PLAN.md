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
### Milestone 12: Progressive Web App (PWA) Manifest & Icons
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Integrated PWA manifest metadata, custom icons, and viewport theme coloring.

### Milestone 13: Service Worker & Hybrid Caching
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Registered a Service Worker (`sw.js`) utilizing Stale-While-Revalidate caching for layout assets and Network-First caching for API transactions.

### Milestone 14: Subtle Tactile Response Animations
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Implemented global click feedback scales and sliding mobile drawers using pure Tailwind transitions.

### Milestone 15: Folder-Based Manga Reader Overlay
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Developed fullscreen overlay supporting paged horizontal LTR/RTL and continuous vertical Webtoon layouts.

### Milestone 16: Client-Side ZIP/CBZ Manga Extraction
*   **Status:** Completed & Verified (June 2026).
*   **Achievements:** Added client-side decompression using JSZip, natural alphanumeric page sorting, and resolved IntersectionObserver lazy-loading issues.
