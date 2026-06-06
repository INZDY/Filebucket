# Filebucket Redesign & Functional Expansion Plan

**Status: Completed & Fully Verified (June 2026)**

This plan outlines the visual redesign and functional expansion of Filebucket, transitioning from the completed MVP base to a premium, Obsidian-inspired workbench with minimal-glassmorphic aesthetics and expanded interactions.

---

## High-Level Goals

1. **Obsidian-Glass Aesthetic:** Shift the dark mode to a premium workbench style utilizing minimal glassmorphic panels, fine borders, royal purple/indigo accents, and smooth transitions.
2. **Interactive Workspace Polish:** Enhance the Vault Browser with right-click context menus, visual drag-and-drop states, and instantaneous inline search.
3. **Note Editor Refinements:** Adjust typography/dimensions to align closely with Obsidian's Live Preview feel, and add a header tag selector with auto-complete.
4. **Expanded Media Previews:** Enable direct, in-app previews for PDF and TXT files in main content tabs.
5. **Split-Screen Landing/Login:** Combine a marketing feature layout on the left and the login interface on the right on the `/login` screen.

---

## Milestones

### Milestone 1: Global Theme & Aesthetics Redesign
*   **Status:** Completed & Verified.
*   **Goal:** Establish the "Obsidian Glass" styling foundation.
*   **Tasks:**
    *   Update [globals.css](file:///C:/Users/Akina/repos/Filebucket/app/globals.css) with a custom color palette (deep charcoal base `#0d0d11`, subtle purple accents `#7c3aed`/`#8b5cf6`, border colors `#1e1e24`).
    *   Create class helper utilities for minimal glassmorphic panels: `backdrop-filter: blur(12px)`, translucent dark backgrounds (`rgba(22, 22, 29, 0.45)`), and thin low-opacity borders (`rgba(255, 255, 255, 0.06)`).
    *   Apply custom typography imports (e.g. Inter/Outfit) and clean scrollbars.
    *   Add global CSS micro-animations for hover, folder expansions, and page transitions.
*   **Verification:** Run `npm run build` and verify that the stylesheet parses correctly.

### Milestone 2: Split-Screen Login & Landing Page
*   **Status:** Completed & Verified.
*   **Goal:** Build the unified entry point.
*   **Tasks:**
    *   Modify [app/login/page.tsx](file:///C:/Users/Akina/repos/Filebucket/app/login/page.tsx) to implement a split-screen container.
    *   **Left Side (Landing):** Elegant typography displaying "Filebucket" and its tagline: *"Your personal, quiet markdown and media vault."* Detail key features (Notes, Media, Tags, Export) with subtle bullet transitions.
    *   **Right Side (Login):** Center a minimal-glassmorphic login card with styled inputs, refined focus borders, and clean error displays.
*   **Verification:** Verify that the page renders correctly, handles credentials validation, and matches the theme.

### Milestone 3: Vault Browser Right-Click & Drag-and-Drop
*   **Status:** Completed & Verified.
*   **Goal:** Enable native desktop-feeling explorer interactions.
*   **Tasks:**
    *   Add custom `onContextMenu` right-click handlers to [folder-row.tsx](file:///C:/Users/Akina/repos/Filebucket/app/folders/folder-row.tsx), [note-row.tsx](file:///C:/Users/Akina/repos/Filebucket/app/notes/note-row.tsx), and [media-row.tsx](file:///C:/Users/Akina/repos/Filebucket/app/media/media-row.tsx).
    *   Open the action menus dynamically at the mouse coordinates (`clientX`, `clientY`) instead of relying solely on the 3-dot trigger.
    *   Enhance visual drag-and-drop states: apply distinct hover highlights and subtle outline effects when drag elements hover over folders or the vault root.
    *   Ensure instantaneous filtering behavior for search input and tags in [page.tsx](file:///C:/Users/Akina/repos/Filebucket/app/page.tsx).
*   **Verification:** Drag items in the tree, trigger right-clicks on folders/notes/media, and check context menu positioning.

### Milestone 4: Note Editor Polish & Header Tag Pills
*   **Status:** Completed & Verified.
*   **Goal:** Align note writing experience with Obsidian and add a tag manager.
*   **Tasks:**
    *   Adjust the Crepe/Milkdown editor CSS wrappers in [globals.css](file:///C:/Users/Akina/repos/Filebucket/app/globals.css) to enforce Obsidian-like paragraph spacing, clean margins, and line heights.
    *   In [app/page.tsx](file:///C:/Users/Akina/repos/Filebucket/app/page.tsx) or [note-editor.tsx](file:///C:/Users/Akina/repos/Filebucket/app/notes/note-editor.tsx), add a dedicated Note Header tag selection component.
    *   Render assigned tags as clean pills with `x` delete actions.
    *   Provide an autocomplete popover/select list to easily search and assign existing tags from the vault database.
*   **Verification:** Create notes, toggle tags, confirm auto-saving tags works, and inspect editor dimensions.

### Milestone 5: PDF & TXT File Previews
*   **Status:** Completed & Verified.
*   **Goal:** Support in-app previews for documents.
*   **Tasks:**
    *   Update `getMediaPreviewKind` in [page.tsx](file:///C:/Users/Akina/repos/Filebucket/app/page.tsx) to identify `"pdf"` and `"text"` file content-types.
    *   For PDF: Render a responsive `<iframe src={previewUrl} className="w-full h-full min-h-[600px] border-0 rounded-md bg-white" />` inside the main content tabs.
    *   For TXT: Perform a server-side fetch from the R2 `previewUrl` (safely handling errors) and render the file text body within a beautiful, styled, read-only pre/code block.
*   **Verification:** Upload PDF and TXT files, open them, and verify that they render correctly in the tab view rather than showing "Preview unavailable".

### Milestone 6: Hardening & Test Verification
*   **Status:** Completed & Verified.
*   **Goal:** Prevent styling and functional regressions.
*   **Tasks:**
    *   Ensure all existing Vitest test suites (auth, CRUD, trash, export) pass cleanly.
    *   Run `npm run build` and `npm run lint` to confirm type-safety and syntax correctness.
*   **Verification:** Console verification of tests, lint, and build.
