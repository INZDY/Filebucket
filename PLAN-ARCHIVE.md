# Filebucket Redesign Plan — Archive

> **Frozen history.** Milestones 17–65, all completed. This file is a record of what shipped, not a backlog.
> Active and planned work lives in `PLAN.md` and the issue tracker. Newest completed milestone last.

This plan outlines the roadmap to transform Filebucket from a single-mode Obsidian-inspired vault into a personal file vault first, and a multi-style note application second (Obsidian, Google Keep, and Discord modes).

---

## Redesign Milestones

### Milestone 17: Database Schema Extension & Seed Data
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Update the data model to support Keep card styling, Discord-style text channels, and type-based folder categories.
*   **Tasks**:
    *   Add `color` (String?) and `isPinned` (Boolean, default false) to the `Note` model in `prisma/schema.prisma`.
    *   Create the `ChatMessage` model with relations to `User` and `Folder`.
    *   Add `chatMessageId` (String?) and relation to `MediaAsset`.
    *   Add `FolderType` enum (`GENERAL`, `NOTES_ROOT`, `KEEP_ROOT`, `CHAT_ROOT`) and a `type` column (default `GENERAL`) to the `Folder` model.
    *   Generate a database migration and update the database seeds/mocks to set up initial reserved folders (`Notes`, `Quick Notes`, `Chat Channels`) tagged with their respective `FolderType`s, and seed initial sample data.
    *   Implement user initialization logic: check for and auto-create the three root reserved folders on first page load or login callback.
*   **Verification**: Run Prisma client generation and check database connections; verify seeded data compiles and check that the three reserved folders are created automatically for a new user.

### Milestone 18: Activity Bar Navigation & Dynamic Sidebar
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Implement the leftmost navigation strip, top-header search redesign, and dynamic view switching with mobile responsive layouts.
*   **Tasks**:
    *   Create an Activity Bar component containing icons for Files, Obsidian Notes, Quick Notes, and Chat Channels.
    *   On mobile viewports, move the Activity Bar to a thumb-accessible Bottom Navigation Bar.
    *   Remove the global "Export Vault" button from the top-header.
    *   Move the global search input from the sidebar browser to the center of the top header next to the app logo and name.
    *   Update `SidebarBrowser` to dynamically switch its content based on the selected mode.
    *   On mobile, hide the Sidebar Browser tree by default and render it as a sliding left Drawer overlay, triggered by a header hamburger button or swiping from the edge.
    *   Implement **independent workspace state tracking per mode** (e.g., active editor tabs for Notes Mode, active file preview for Files Mode) so switching modes preserves workspace tabs in the background.
    *   Hook up mode switching to **instantly flush and save** any pending autosave changes before the transition occurs.
    *   Implement the **search overlay logic in the sidebar browser**: typing in the header search input temporarily displays a search results list in the sidebar with toggleable chips (`All`, `Files`, `Notes`, `Chats`) to filter results. Hitting backspace or clearing search returns the sidebar to the active mode.
*   **Verification**: Click each icon in the Activity Bar / Bottom Nav and verify the sidebar updates; verify the search bar renders centered; verify the left drawer slides out on mobile. Verify swapping modes preserves open note tabs and triggers immediate autosave flush. Verify search input triggers search results in the sidebar with active filters.

### Milestone 19: Google Keep Mode (Card Grid & Modal Editor)
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Create a rich, authentic Google Keep workspace for quick notes and scratchpads with mobile responsiveness and smart save triggers.
*   **Tasks**:
    *   Build a masonry/responsive card grid workspace in the Main Content Pane when in Keep mode (3-4 columns on desktop, 1 column stack on mobile).
    *   Implement "Pinned" and "Others" sections. Sort cards within each section chronologically by `updatedAt desc` (no manual reordering).
    *   Build the top "Take a note..." inline creation bar with text and checklist options.
    *   Build a Card Edit Modal supporting title/body editing, interactive checklist toggles, card color picker, tags, and deletion. On mobile, render this modal as a fullscreen sheet overlay.
    *   Implement **Markdown Checklist Sync**: Parse the note's text body (standard Markdown checkboxes `- [ ]` / `- [x]`) into editable list inputs in the UI, and serialize changes back to Markdown format on save.
    *   Implement **smart save triggers**: debounced autosave (1.5s delay) for card text inputs, and instant save (immediate database update) for clicking checklist checkboxes, card color options, pin/unpin toggles, or delete buttons.
*   **Verification**: Create notes, pin/unpin cards, change colors, toggle checklists, and edit cards in the modal; verify mobile layout collapses to a 1-column stack and edits happen in fullscreen. Verify instant saves commit immediately and card text edits debounce.

### Milestone 20: Discord Mode (Chat Channel Stream)
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Create a chronological chat channel stream for short text messages and media captures with mobile viewport handling and Manga Reader integration.
*   **Tasks**:
    *   Build the Chat Panel workspace in the Main Content Pane when in Chat Channels mode.
    *   Render messages chronologically with timestamps and sender headers.
    *   Implement auto-hyperlinking and basic link/attachment previews (images displayed inline, other files as downloadable cards).
    *   Build a message input bar at the bottom with a file upload button (`+` icon). On mobile, ensure the input stays visible, docked above the Bottom Navigation Bar, and pushes up when the virtual keyboard is open.
    *   Store uploaded chat attachments in a dedicated folder **`Chat Channels/Attachments/`** at the vault root and link them as `MediaAsset` records to the chat message.
    *   Enforce **strict session ownership scoping** on all chat message query and creation APIs (`userId === session.user.id`).
    *   Allow message deletion on hover (or long-press context menu on mobile).
    *   On mobile, support swipe-right to open the channels list drawer.
    *   Integrate **Manga Reader overlay with chat media**: clicking a chat image or a ZIP/CBZ archive decompress it in-browser, restores page progress from `localStorage` (using the media asset ID), and supports swiping chronologically through all loose images uploaded to the channel history.
*   **Verification**: Type and send messages, upload images, click links, and delete messages; verify mobile keyboard alignment and edge swiping. Verify clicking an image or ZIP chat attachment opens the Manga Reader, sequences through the feed history, and resumes progress from `localStorage`.

### Milestone 21: General File Storage & Boundary Validation
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Enforce system folder rules, lock down the general file explorer, enable context-specific downloads, and adapt Obsidian tabs/outline for mobile.
*   **Tasks**:
    *   Make `Notes/`, `Quick Notes/`, and `Chat Channels/` reserved folders at the vault root. Disable rename, move, and delete actions on them.
    *   Show custom, styled icons in the vault browser for reserved folders.
    *   Enforce boundaries (block note creation in Files, block folders in Quick Notes, block subfolders inside chat channels).
    *   Implement Contextual Export/Download actions (raw file, folder ZIP, note `.md`, chat transcript `.md` with message history).
    *   On mobile, adapt the Obsidian editor tabs: hide the scrollable tab bar, show the active note title with a tabs count button, and open a bottom sheet to switch tabs. Render the note outline as a sliding right drawer on mobile.
    *   Implement **cross-mode link navigation**: clicking a media reference link (e.g. image or PDF link) inside a markdown note auto-switches the Activity Bar mode to Files Mode and opens the media preview while highlighting the file in the sidebar tree.
*   **Verification**: Attempt to rename reserved folders, verify boundaries. Verify folder ZIP download compiles, chat transcript export works, and clicking a file reference inside a note switches modes and previews the media file.

### Milestone 22: Testing & Hardening
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Verify the stability, responsiveness, and performance of the hybrid vault system.
*   **Tasks**:
    *   Write Vitest component and logic tests covering view mode switching, validation constraints, and database relations.
    *   Verify drag-and-drop actions are locked down correctly for reserved folders.
    *   Ensure PWA offline caching works for the new routes and APIs.
*   **Verification**: All tests pass.

### Milestone 23: Activity Bar Redesign & Trash Relocation
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Redesign the leftmost navigation strip and mobile bottom bar for mode-specific styling, squircle selection shapes, and relocate Trash.
*   **Tasks**:
    *   **Activity Bar Dimensions:** Reduce Activity Bar width (from `md:w-16` to `md:w-12` or `md:w-14` on desktop) and vertical gap between buttons (from `md:gap-5` to `md:gap-3` and reduced padding).
    *   **Selection Highlights:** Implement Option A color-coded active states (Blue for Files, Purple for Notes, Amber for Keep, Indigo for Chat, and Rose Red for Trash). 
    *   **Highlight Shape:** Remove the active indicator pips (desktop left pip, mobile top pip) and style active icons using a rounded-squircle (`rounded-xl` / glass border) with a soft colored glow drop shadow.
    *   **Trash Placement:** Remove the Trash button from the bottom of the sidebar browser component. Position it at the bottom of the vertical Activity Bar (desktop) separated by a spacer/divider, and as the rightmost button on the mobile Bottom Navigation Bar.
*   **Verification**: Visual inspection of the Activity Bar / Bottom Nav in all viewports. Verify width reduction, tightened spacing, and mode-specific colored squircle active states (no pips). Verify the Trash button renders in the new location and glows Rose Red when active.

### Milestone 24: Files Mode Global Explorer & Toolbar Filtering
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Enable inline exploration of reserved folders inside Files Mode and filter toolbar actions per mode.
*   **Tasks**:
    *   **Files Mode reserved folders visibility:** Modify the folder list filter for Files Mode so that the reserved folders `Notes/`, `Quick Notes/`, and `Chat Channels/` appear at the root of the file explorer tree.
    *   **Inline Expansion:** Support expanding the `Notes/` and `Chat Channels/` folders inline in Files Mode to let the user browse subfolders and media files directly in the Files tree.
    *   **Contextual Mode-Switching Clicks:** Clicking a `.md` note inside `Notes/` switches the mode to Obsidian Mode and opens the note; clicking `Quick Notes/` or any Keep Note switches to Keep Mode; clicking a Chat Channel folder inside `Chat Channels/` switches to Chat Mode.
    *   **Action Toolbar Filtering:**
        *   In Files Mode, hide the "Create Note" and "Import Notes" buttons. Show only "Create Folder" and "Upload Media" to block note creation in Files Mode.
        *   In Obsidian Mode, show all action buttons (Create Note, Create Folder, Upload Media, Import Notes).
        *   In Chat Mode, show only the "Create Folder" button (configured as "New Channel").
        *   In Keep Mode, ensure the toolbar remains hidden.
*   **Verification**: Enter Files Mode and verify `Notes/`, `Quick Notes/`, and `Chat Channels/` are displayed. Expand `Notes/` and verify subfolders are visible inline. Click a note and verify it switches active modes to Obsidian and opens the note. Verify the action toolbar dynamically filters buttons on mode switch.

### Milestone 25: Cross-Mode Move Enforcement & Boundary Hardening
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Prevent domain data contamination by enforcing boundary moves between modes at the API and drag-and-drop levels.
*   **Tasks**:
    *   **Folder Boundaries:** Prevent moving folders between Files Mode and `Notes/` subfolders. Block cross-mode folder drops and API actions.
    *   **Note Boundaries:** Prevent moving notes out of the `Notes/` directory structure. Block note moves to Files Mode.
    *   **Media Asset Free movement:** Ensure media assets (files) are allowed to be moved back and forth between Files Mode and `Notes/` subfolders (to support attachments organization).
    *   **Keep & Chat Silos:** Block all boundary moves on Keep notes and Chat Channels/attachments to lock them within their respective root directories.
*   **Verification**: Attempt drag-and-drop actions that violate these boundaries (e.g., dropping a folder from Files into Notes or vice versa) and verify they are rejected. Attempt moving a note out of Notes and verify it is blocked. Verify moving media assets still works.

### Milestone 26: Workspace Tabbing & Vault Tree Polish
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Remove tabs from Files Mode and fix visual indentation and item counts within the Vault Browser tree.
*   **Tasks**:
    *   **Files Mode Tabbing:** Completely hide/remove the tab bar inside Files Mode. Preview opened media assets directly in the workspace, with selecting a media file replacing the active preview layout.
    *   **Vault Tree Indentation:** Shift the base padding of `NoteRow` and `MediaRow` elements in `BrowserTree` from `12px` to `28px` (yielding `28px + depth * 16px` padding) so their file icons align perfectly under sibling and parent folder icons.
    *   **Remove Folder Children Count:** Remove children count indicator elements (`folder.count`) entirely from all folder rows (including user folders, reserved system folders, and the root `Vault` row) to achieve a clean, clutter-free sidebar.
*   **Verification**: Verify Files Mode has no tab bar and displays files directly. Verify visual icon alignment in the sidebar browser. Verify no children count is displayed on any folder rows.

### Milestone 27: Responsive Mobile Manga Reader & Sidebar Drawer Triggers
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Fix mobile Manga Reader controls, eliminate redundant drawer toggles, and optimize navigation bar padding.
*   **Tasks**:
    *   **Manga Reader Mobile Polish:** On mobile viewports (< 640px), make the Layout Mode toggles icon-only (hiding text labels) and swap the generic book icon for directional arrows: `ArrowRight` (LTR), `ArrowLeft` (RTL), and `ArrowUpDown` (Webtoon). Replace the aspect-ratio `<select>` dropdown with a single compact toggler button to switch between "Fit Width" and "Fit Height". Add max-width constraint to titles to guarantee truncation.
    *   **Sidebar Toggle Restructuring:** Remove the floating workspace drawer toggle (`PanelLeft` button) completely. Show the header hamburger toggle button on all tablet and mobile screen sizes under 1024px (`lg:hidden` instead of `md:hidden`) to serve as the unified drawer trigger.
    *   **Trash & Activity Bar Spacing:** Add a flex spacer (`hidden md:block md:flex-1`) in the Activity Bar on desktop to push the Trash icon cleanly to the bottom. Group and evenly distribute layout weights (`flex-1` for all 5 buttons) in the mobile Bottom Navigation Bar for perfect spacing.
*   **Verification**: Verify header controls do not overflow in mobile Manga Reader. Verify the floating left button is gone and the header hamburger menu toggles the sidebar on both mobile and tablet. Verify even button spacing in bottom nav.

### Milestone 28: Keep Cards Markdown Rendering & Chat Multiline Input
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Render markdown inside Keep grid cards, increase font sizes, expand editor vertical space, and support multiline chat input.
*   **Tasks**:
    *   **Keep Note Font Size:** Increase card and modal text body font sizes from `text-xs` (12px) to `text-sm` (14px) for better readability.
    *   **Markdown Keep Cards:** Parse and render standard Markdown in Keep note card grids (using a clean markdown preview renderer). Clamp notes in grid to a maximum height of `max-h-72` (280px) and apply a bottom fade-out gradient.
    *   **Responsive Columns:** Set columns dynamically: 1 column on mobile (< 640px), 2 columns on tablet (640px - 1023px), 3 columns on small desktop (1024px - 1440px), and 4 columns on wide screens (> 1440px).
    *   **Modal Height:** Increase the desktop editor modal maximum height to `95vh` to give maximum editing canvas space.
    *   **Chat Multiline Input (Shift + Enter):** Swap the single-line `<Input>` in `ChatWorkspace` with an auto-expanding `<textarea>` (default height `h-10`, auto-growing up to `max-h-36`). Configure key events so that hitting `Enter` sends the message, and `Shift + Enter` inputs a newline (mobile keyboard default remains newline insertion).
*   **Verification**: Verify card text size and markdown support. Verify chat input handles Shift+Enter newlines, and submits on Enter.

### Milestone 29: Sidebar Resizability & Persistence
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Persist the width of the resizable Vault Browser panel and support fallback minimum size.
*   **Tasks**:
    *   **Width Persistence:** In `ResizableVault`, store the resized browser panel percentage or pixel width in `localStorage` (using key `filebucket_sidebar_width`).
    *   **Hydration-Safe Restore:** Read the stored width in a `useEffect` after mounting to prevent SSR hydration mismatches, then apply the size dynamically to the `<Panel>` component.
    *   **Minimum Default Size:** If no width has been saved in `localStorage`, default the sidebar size to its minimum possible width (e.g., `280px` or minimum percentage size).
*   **Verification**: Resize the sidebar, reload the page, and verify the width is preserved. Clear `localStorage` and verify the sidebar defaults to its minimum width.

### Milestone 30: Files Mode Folder-Only Tree & Special Folders Visibility Toggle
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Show folders only in Files Mode tree and implement a toggle to hide or show special reserved folders.
*   **Tasks**:
    *   **Folder-Only Filtering:** In Files Mode, update `BrowserTree` to filter out notes and media assets so that only the folder tree structure is shown.
    *   **Special Folders Toggle:** Add a "Show/Hide Special Folders" button or icon to the vault browser toolbar when in Files Mode.
    *   **Default Behavior:** Default the toggle to **hide** special folders (`Notes/`, `Quick Notes/`, `Chat Channels/`) at the root level.
    *   **State Persistence:** Store the toggle state in `localStorage` so it persists across page reloads.
*   **Verification**: Enter Files Mode and verify no note or media rows are displayed in the tree. Verify that the `Notes/`, `Quick Notes/`, and `Chat Channels/` directories are hidden by default. Click the toggle to show them and verify they appear, then refresh the page and verify the state is preserved.

### Milestone 31: Main Content Pane Folder Contents View (Files Mode)
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Render all contents of the selected folder in the main content panel in Files Mode.
*   **Tasks**:
    *   **Folder Contents Display:** When in Files Mode and a folder (or root) is active with no media preview open, render a `FolderContentsView` grid/list in the Main Content Pane.
    *   **Mixed Child Listing:** Retrieve and render all direct children of the selected folder: subfolders (with custom icons), notes, and media assets.
    *   **Navigation & Actions:**
        *   Clicking a folder navigates the Vault Browser into that folder.
        *   Clicking a media asset opens its preview in the Main Content Pane.
        *   Clicking a note switches the mode to Obsidian Notes and opens the note.
    *   **Empty State:** Handle empty folder states cleanly with helpful design.
*   **Verification**: Click a folder in Files Mode tree. Verify the main content pane displays the items inside it. Click a subfolder in the grid to navigate deeper. Click a file to preview it. Click a note to switch to notes mode and edit it.

### Milestone 32: Tree Views Topmost Root Hiding
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Hide the topmost root header in the tree browser for a cleaner presentation.
*   **Tasks**:
    *   **Topmost Row Removal:** Update `BrowserTree` to omit rendering the topmost folder row (which shows "Vault", "Notes", or "Chat Channels" as the root node).
    *   **Direct Child Rendering:** Render the first-level children of the root folder directly at the top level of the tree (with appropriate indentation).
    *   **Root Drag & Drop Support:** Ensure the vault root drop zone remains operational so items can still be dragged and dropped into the root.
*   **Verification**: Verify the "Vault", "Notes", or "Chat Channels" topmost rows are hidden and their child items are rendered at the root level of the sidebar tree. Verify drag-and-drop to root still works.

### Milestone 33: Keep Note Edit Modal React Portal Integration
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Mount the Keep edit modal directly to `document.body` using React Portal so it overlays the entire viewport (including the app header/footer) and applies background blur globally.
*   **Tasks**:
    *   Import `createPortal` in `app/vault/keep-workspace.tsx`.
    *   Wrap `KeepEditModal`'s outer overlay layout container JSX in `createPortal(..., document.body)`.
    *   Implement an SSR-safe check to prevent pre-render execution during Node.js compilation.
*   **Verification**: Open a Keep card on desktop and verify the blurred backdrop covers the top app header. Open a Keep card on mobile and verify it overlays the header and bottom nav bar completely.

### Milestone 34: Mobile Viewport Scrolling & Bouncing Lock-down
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Lock down browser viewport height and body scroll boundaries to keep the app header and footer navigation bar fixed in view on mobile devices.
*   **Tasks**:
    *   Add `html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }` to `app/globals.css` to disable body drag bounce and address bar dynamic layout shifts.
    *   Change standard `h-screen` viewport containers to `h-[100dvh]` on layout wrappers in `app/page.tsx` for precise viewport height matching.
*   **Verification**: Simulate dynamic scrolling or swiping near top/bottom boundaries on mobile viewports; verify only internal elements scroll and that the app header and bottom nav bar stay persistently locked in-frame.

### Milestone 35: Files Mode Folder Contents View Drag & Drop Interactivity
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Enable complete drag-and-drop move operations within the Folder Contents View grid container.
*   **Tasks**:
    *   Add `draggable={true}` to folder, note, and media asset cards inside `FolderContentsView` (`active-workspace.tsx`) and populate `application/filebucket` dataTransfer with their ID and type on drag start.
    *   Implement drop event handlers to move items when:
        *   Dropped onto a subfolder card in the grid (moves item into that subfolder).
        *   Dropped onto parent folder links or "Vault" root in the header breadcrumbs (moves item to target location).
        *   Dropped onto the empty grid background pane (moves external tree rows into the currently open folder).
    *   Enforce mode-specific move boundaries and handle name collision alerts.
*   **Verification**: Verify dragging cards in the content grid and dropping them onto other folder cards or breadcrumbs triggers correct server action moves. Drag a row from the sidebar explorer tree and drop it onto the content pane background; verify it moves to the open folder.

### Milestone 36: Sidebar Browser Header Clean-up
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Prune the static `"Vault Browser"` label from the sidebar panel header to reduce visual noise.
*   **Tasks**:
    *   Remove the static `<p>` header tag displaying `"Vault Browser"` from `sidebar-browser.tsx`.
    *   Adjust top spacing/margins of the location breadcrumbs trail to align cleanly inside the sidebar container.
*   **Verification**: Open the app and verify the `"Vault Browser"` text header is removed from the sidebar browser top section, leaving only the location breadcrumbs visible.

### Milestone 37: Brand Color & Global Styling Updates
*   **Status**: Completed.
*   **Goal**: Shift global brand styling to Blue, update the app-wide logo, and style the app icon background with a dark squircle gradient.
*   **Tasks**:
    *   Modify `app/globals.css` variable tokens to set brand Blue (`--primary: 221.2 83.2% 53.3%` or similar HSL blue) replacing the purple theme colors.
    *   Update `public/icon.svg`:
        *   Simplify the bucket outline path and lock front face details.
        *   Keep the folder nested inside the bucket, but remove the document page path.
        *   Paint the bucket artwork in a vibrant blue shade.
        *   Overlay the logo onto a dark charcoal/deep slate gradient square with corner rounding (`rx="120"` / `ry="120"`) to create a squircle app icon. Do not use an outer border glow.
    *   Replace the generic `Cloud` icons inside the app header (`app/page.tsx`) and the login page (`app/login/page.tsx`) with the actual `/icon.svg` brand logo centered inside a `rounded-xl` (squircle) background plate with a subtle drop shadow.
    *   Keep Obsidian Notes mode and tag pills styled in Purple as secondary accents, but update Keep checkbox selection elements to use Keep's mode-specific Amber color.
*   **Verification**: Check that brand accents are blue globally, verify PWA manifest icon `/icon.svg` renders as a squircle, and check that the login page and header render the Filebucket logo on a squircle background.

### Milestone 38: Unified Tiptap Rich Text Editor Setup
*   **Status**: Completed.
*   **Goal**: Set up Tiptap editor engine supporting native markdown serialization, mixed lists/paragraphs, and checked items auto-sorting.
*   **Tasks**:
    *   Install Tiptap core dependencies (`@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`) and `tiptap-markdown` for markdown conversions.
    *   Create a modular `FilebucketEditor` component wrapping the Tiptap canvas.
    *   Configure `FilebucketEditor` to parse markdown shortcuts dynamically (`# `, `* `, `1. `, `[ ] `).
    *   Implement an event trigger or Tiptap extension to auto-sort checked checklist items to the bottom of their parent `taskList` block.
    *   Set up visual rendering styles in `app/globals.css` matching the design system (headings, bold, lists).
*   **Verification**: Run tests on the editor wrapper; verify typing shortcuts yields styled tags inline and that checking a task item moves it to the bottom of the list block.

### Milestone 39: Replace Markdown Editors in Obsidian & Keep Workspaces
*   **Status**: Completed.
*   **Goal**: Integrate Tiptap editor into Notes Mode and Keep Mode modal/creation forms using Next.js dynamic imports.
*   **Tasks**:
    *   Replace Milkdown Crepe in `app/notes/note-editor.tsx` with the new `FilebucketEditor` component.
    *   Connect inline image picker assets insertion so that images serialize as `![filename](filebucket-media:id)` inside Tiptap.
    *   Replace the raw `<textarea>` and checklist inputs in `app/vault/keep-workspace.tsx` (edit modal and creation card) with the Tiptap editor.
    *   Apply Amber styling variables to Tiptap checklist task elements in Keep Mode.
    *   Wrap editor loads with `next/dynamic` (`ssr: false`) to optimize initial page loading.
*   **Verification**: Open a markdown note in Obsidian mode and verify Tiptap renders and saves note edits. Open a Keep card and verify mixed checklist and paragraph editing works, checkbox toggles work, and files don't block initial SSR loading.

### Milestone 40: Client-Side Selection State & Shallow Routing
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Eliminate full server-side page fetches on item navigation by using client selection states and shallow routing.
*   **Tasks**:
    *   Refactor active selection parameter checks in `app/page.tsx` and workspaces.
    *   Load the directory tree layout structure once on mount. On row clicks inside `SidebarBrowser`, update client-side selection state dynamically.
    *   Use `window.history.pushState` or dynamic query string replacements to synchronize parameters (`?folder=...&note=...`) client-side without executing server-side route re-renders.
    *   Expose clean API routes (`/api/notes/[id]` and `/api/folders/[id]`) to dynamically fetch note data and folder items details on client state changes.
*   **Verification**: Click folders and notes in the sidebar tree. Verify navigation is instantaneous, URL parameters update in the address bar, and note details load dynamically without full-page server round-trips.

### Milestone 41: Optimistic UI Updates & Transition Hardenings
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Ensure action responses (renaming, trashing, checking, pinning) feel instantaneous to the user.
*   **Tasks**:
    *   Implement optimistic UI updates for Keep card updates (checkbox state toggles, pin states, card colors, tag associations).
    *   Implement optimistic UI updates for folder explorer row operations (inline rename, trash, moves).
    *   Add smooth fade/slide CSS transitions and content skeletons to the workspace pane to mask dynamic API data fetches.
*   **Verification**: Perform folder renames, keep note pinning, and checklist checkmarks; verify UI updates instantly in the browser without waiting for server responses. Check that loading skeletons show gracefully during load times.

### Milestone 42: Editor Padding, Checklist Ordering & Checkbox Styling Polish
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Adjust Obsidian editor top/bottom/side padding, remove `AutoSortChecklist` plugin, and unify checkbox sizing and borders across Notes and Quick Notes.
*   **Tasks**:
    *   Update `.notes-editor.ProseMirror` padding in `app/globals.css` to `32px 24px 32px` (down from `96px 20px 72px`) to reduce top whitespace.
    *   Remove the `AutoSortChecklist` extension from `components/filebucket-editor.tsx` so checked items retain their exact original order in both Notes and Quick Notes.
    *   Update checkbox styles in `app/globals.css`: increase size from 14px to 18px (`1.125rem`), unify border color to light gray (`#64748b` / slate-500) for unchecked checkboxes across Notes and Quick Notes, and set filled Primary Blue background with white checkmark when checked.
*   **Verification**: Open an Obsidian note; verify top padding is 32px. Toggle task checkboxes in Notes and Keep Notes; verify items do not auto-sort to the bottom, checkboxes are 18px with light gray border, and checked state fills with Primary Blue.

### Milestone 43: Landing Page Branding & Favicon Integration
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Update landing/login page color scheme to brand Blue and configure app-wide favicon.
*   **Tasks**:
    *   Update `app/login/page.tsx`: replace all purple/indigo background glows, gradient headings (`from-blue-600 to-indigo-600`), icon badges, input focus rings, and button gradients with cohesive brand Blue accents.
    *   Configure `app/layout.tsx` metadata with `icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" }` and set app routing favicon so all browsers and PWA devices load `public/icon.svg` as the favicon.
*   **Verification**: Navigate to `/login`; verify blue primary theme branding across headings, buttons, and badges. Check browser tab title bar; verify the app favicon renders cleanly.

### Milestone 44: Skeleton Loading Bug Fix & Instant Directory State Sync
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Resolve stuck skeleton loading states and eliminate page reloads for folder creation, file uploads, and file deletions.
*   **Tasks**:
    *   Fix stuck skeleton bug in `app/vault/vault-dashboard.tsx`: reset `isNoteLoading` and `isFolderLoading` state flags to `false` on mode transitions and navigation updates, and add a safety fetch timeout so skeletons never hang indefinitely.
    *   Update folder creation (`createFolderAction`), media file uploads (`MediaUploadControl`), and file deletion handlers in `browser-toolbar.tsx`, `media-upload-control.tsx`, and action menus to dispatch `vault-mutate` custom events for immediate client state updates (`folders`, `mediaAssets`, `notes`) alongside `router.refresh()`.
*   **Verification**: Rapidly switch between modes and click notes/folders; verify loading skeletons never hang. Create folders and upload/delete files; verify items appear and disappear immediately without needing a manual browser page reload.

### Milestone 45: Thumbnail Grid Rendering, Compact Card Layout & Direct File Operations
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Render live image/video thumbnails, compact card grid padding, and enable card file operations (Move/Rename/Delete) without preview loading.
*   **Tasks**:
    *   Update `FolderContentsView` in `app/vault/active-workspace.tsx`:
        *   Render live `<img>` thumbnails for image media and `<video>` metadata thumbnails for video media inside an `aspect-video` container.
        *   Reduce card outer padding from `p-4` to `p-2` with compact truncated filename footers for maximum visual area and higher density.
        *   Add a top-right 3-dots overflow menu button to every file card, right-click context menu listener, and mobile long-press / touch sheet support to trigger Move, Rename, and Move to Trash operations directly on cards without loading file previews first.
*   **Verification**: View a folder containing images/videos in Files Mode; verify live image/video thumbnails render inside compact `p-2` aspect-video cards. Click the 3-dots menu on a card without previewing; verify Move, Rename, and Delete work directly from the grid view and update client state instantly on mobile and desktop.

### Milestone 46: Checkbox Line Alignment & Layout Fixes
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Ensure task list / checklist text is perfectly aligned on the same line as checkboxes across Obsidian Notes and Keep Notes without breaking into new lines.
*   **Tasks**:
    *   Enforce inline flex layout contract in `app/globals.css` for `.ProseMirror li[data-type="taskItem"]`, `.prose li.task-list-item`, and `keep-workspace.tsx` ReactMarkdown `li` items: `display: flex; align-items: flex-start; gap: 0.5rem;`.
    *   Force descendant `<p>` and `<div>` tags inside task item `<li>` elements to `display: inline; margin: 0;` to prevent block line breaks beneath the checkbox input.
    *   Offset checkbox vertical position (`margin-top: 0.2rem` / `translate-y-[2px]`) to align with the first line's font cap-height.
*   **Verification**: Create multi-line and single-line task list items in both Obsidian Note Editor and Keep Note cards; verify text remains on the same top line next to the checkbox across viewports and line wraps cleanly under text rather than under the checkbox icon.

### Milestone 47: Mode-Aware Checkbox Theme Colors (Purple & Amber/Yellow)
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Theme checkboxes dynamically based on active application mode (Purple for Obsidian Notes, Amber/Yellow for Keep Notes).
*   **Tasks**:
    *   In `app/globals.css`, scope checkbox rules by editor/workspace mode wrapper classes (`.notes-editor` / Obsidian Notes Mode vs `.keep-editor` / `.keep-card-container` / Keep Mode).
    *   Set checked state background (`#8b5cf6` / `bg-purple-600`), borders (`#a855f7`), and focus rings to Purple under Obsidian Notes Mode.
    *   Set checked state background (`#f59e0b` / `bg-amber-500`), borders (`#fbbf24`), and focus rings to Amber/Yellow under Keep Notes Mode.
    *   Maintain subtle slate (`#64748b` / slate-500) borders in unchecked state with mode-specific hover glow tints.
*   **Verification**: Check task items in Obsidian Notes Mode; verify checked boxes fill in Purple. Check task items in Keep Notes Mode (workspace cards and modal editor); verify checked boxes fill in Amber/Yellow.

### Milestone 48: Files Mode Folder Contents View Section Split & Card Refinement
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Restructure Folder Contents View into distinct Folders and Files/Notes sections to eliminate empty card space and polish card layouts.
*   **Tasks**:
    *   Refactor `FolderContentsView` in `app/vault/active-workspace.tsx` to separate content into two sections:
        *   **Folders Section (Top)**: Compact, fixed-height subfolder pills (`h-14` / compact flex cards) with Folder icon, folder name, item count badge (e.g. `"X items"`), and top-right 3-dots overflow menu (`FolderActionsMenu`).
        *   **Files & Media Section (Bottom)**: 16:9 aspect-video thumbnail cards grid for media assets and notes with metadata footers and 3-dots overflow menus.
    *   Eliminate empty space under folder cards by giving folders a dedicated compact layout separate from tall file thumbnail heights.
    *   Ensure drag-and-drop support continues working seamlessly for both subfolder pills and file thumbnail cards.
*   **Verification**: Open Files Mode in a folder containing both subfolders and media files; verify subfolders display in a clean compact top section with item counts and no empty vertical space, while media assets display in a responsive 16:9 thumbnail grid below. Verify drag-and-drop and context menus function properly in both sections.

### Milestone 49: Fix Client-Side State Synchronization & Upload Crashes
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Fix the client exception during newly uploaded file previews and resolve errors when modifying optimistically created folders immediately.
*   **Tasks**:
    *   Update the returned object of `createMediaAssetAction` in `app/media/actions.ts` to include all database attributes (e.g. `r2Key`, `contentType`, `sizeBytes`, `createdAt`, etc.) instead of a trimmed projection.
    *   Add defensive type guards in `getMediaPreviewKind` in `app/vault/active-workspace.tsx` (and other files) to return `"unsupported"` when `contentType` is undefined/null.
    *   Add `useEffect` hooks in `VaultDashboard` (`app/vault/vault-dashboard.tsx`) to synchronize `initialFolders`, `initialNotes`, and `initialMediaAssets` with their respective state setters (`setFolders`, `setNotes`, `setMediaAssets`) upon prop updates. This guarantees optimistic `temp_` keys are seamlessly replaced by real DB keys on next-tick rendering updates.
*   **Verification**: Upload a file in Files Mode and immediately preview it; verify it loads cleanly without throwing any client-side exception. Create a folder in Files Mode and immediately rename/delete/move it; verify the action executes successfully without server database errors.

### Milestone 50: Card Grid Polish & Overflow Menu Warping Fix
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Increase subfolder card height for better visual breathing room and fix the overflow menu warping click bug.
*   **Tasks**:
    *   In `FolderContentsView` (`active-workspace.tsx`), increase the subfolder pill height from `h-12` to `h-14` (e.g., modifying class names to `h-14 px-4`).
    *   Resolve card overflow menu click registering/warping by refactoring card components in `FolderContentsView`. Instead of applying `active:scale-95` on the outer relative wrapper container, apply the active transition scale to the inner `Link` wrapper. Keep the absolute-positioned 3-dots action menu wrapper outside the scaling link, ensuring the menu button remains perfectly static during mousedown/mouseup clicks.
*   **Verification**: Visually inspect subfolder cards; verify their height is `h-14`. Hover and click the 3-dots overflow menu on note and media cards; verify the menu opens exactly under the cursor and actions register successfully without the button warping or scaling down.

### Milestone 51: Unified File Size Scaling Utility
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Refactor byte formatting to scale dynamically to KB, MB, GB, etc., and unify it across the entire workspace.
*   **Tasks**:
    *   Create a single canonical `formatBytes(bytes: number, decimals = 1): string` utility inside `lib/utils.ts` that scales properly (B, KB, MB, GB, TB).
    *   Replace ad-hoc formatting inline functions inside `app/media/media-upload-control.tsx`, `active-workspace.tsx`, `chat-workspace.tsx`, and `trash-workspace.tsx` with calls to the new `formatBytes` helper.
*   **Verification**: Inspect file uploads, file cards, chat attachments, and trash view metadata; verify file sizes display with appropriate units (e.g. `512 B`, `24 KB`, `4.5 MB`, `1.2 GB`).

### Milestone 52: Storage Usage Checker & Visualizer
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Enable checking the current vault storage usage dynamically against a default quota limit.
*   **Tasks**:
    *   Implement an API route `/api/storage/usage` (or server action) that aggregates the sum of `sizeBytes` of all `MediaAsset` records belonging to the authenticated user.
    *   Create a clean, visual storage indicator component (progress bar displaying "Used X MB of Y GB", e.g. using a default quota of 10 GB).
    *   Place the storage usage card at the bottom of the sidebar panel (`app/vault/sidebar-browser.tsx`), directly above the Trash bar separator.
*   **Verification**: Upload multiple files and observe the storage usage progress bar updating dynamically in the sidebar.

### Milestone 53: Video.js Media Player Integration
*   **Status**: Completed & Verified (July 2026).
*   **Goal**: Replace browser default audio/video players with a premium custom Video.js instance featuring minimal skins.
*   **Tasks**:
    *   Install `video.js` and `@types/video.js`.
    *   Create a reusable, highly polished HTML5 media player component (`FilebucketPlayer`) wrapping Video.js with a sleek, borderless dark theme.
    *   Integrate the player inside the media preview pane in `active-workspace.tsx` for video and audio content.
*   **Verification**: Open video and audio assets in Files Mode; verify they load in a beautiful custom player instead of standard browser controls.

### Milestone 54: Bulk Selection & Bulk Actions
*   **Status**: Completed & Verified (August 2026).
*   **Goal**: Implement a selection-mode toggle and bulk actions bar in the Folder Contents View (Files Mode), enabling multi-item Move, Move to Trash, and Download ZIP.
*   **Tasks**:
    *   Add a "Select"/"Cancel" toggle button to the Folder Contents View breadcrumb bar, visible only in Files Mode.
    *   In selection mode, suppress card navigation, drag-and-drop, card overflow menus, right-click context menus, and the mobile long-press sheet; click/tap toggles membership and overlays a dimmed check indicator (visual overlay only, no event-capturing layer).
    *   Selection covers folders and media assets (notes never render in Files Mode); support "Select all" for the current folder; no shift-click range selection.
    *   Keep selection state local to `ActiveWorkspace`; auto-exit selection mode on opening an item, switching mode, or navigating to another folder; clear after a bulk action runs; persist across sidebar use within the same folder.
    *   Add array-accepting bulk server actions (`bulkMove`, `bulkTrash`) validating each item through the namespace manager (best-effort move with collision report), single `revalidatePath` plus optimistic `vault-mutate` update, no navigation.
    *   Extend `/api/export` to accept an explicit selection id set for bulk ZIP download, unioning selected subtrees/files and deduping.
    *   Add a docked Bulk Actions bar (Move, Move to Trash, Download ZIP) to the Folder Contents View when items are selected.
*   **Verification**: Enter selection mode in Files Mode; select multiple folder/media cards and verify they show the check indicator and do not open. Verify Move applies one destination with collision reporting, Trash cascades correctly, and ZIP downloads exactly the selection. Verify the selection bar clears after actions and on navigation.

### Milestone 55: E-Book Reader Integration (EPUB & TXT)
*   **Status**: Completed & Verified (August 2026).
*   **Goal**: Build fullscreen Book Reader using `epubjs` for EPUBs and custom styling for TXT. Add theme support (Light Brown, Glass Dark, Light Mode), layout modes (Paged vs Scroll), search, and progress/reading speed footnotes.
*   **Tasks**:
    *   Integrate `epubjs` package for client-side rendering of EPUB archives.
    *   Build a responsive Book Reader component supporting fullscreen overlay, paged vs. scroll layouts, and a Table of Contents navigation drawer.
    *   Add a custom plain-text text reader view inside the same component to render `.txt` files with custom margins, font selections, and scroll progress tracking.
    *   Support styling themes matching the system options (Glass Dark, Light Mode, and Light Brown) and customizable font size presets.
*   **Verification**: Open an EPUB or TXT file inside Files Mode and launch the Book Reader. Toggle layout styles, themes, and font size, and verify the reader layout updates.

### Milestone 56: Database Schema Expansion, Cloud Progress Sync & Offline Caching
*   **Status**: Completed & Verified (August 2026).
*   **Goal**: Sync reading position (CFI/percentage/page indexes) via `/api/media/progress` for both Manga and Book Readers, extend Prisma schema for `UserSettings` and `MediaProgress`, and cache files using PWA Service Worker.
*   **Tasks**:
    *   Extend Prisma schema: Add `UserSettings` (global theme, storage quota limit, default note font, autosave delay) and `MediaProgress` (active position, reading percentage, volume level, active settings) models.
    *   Create `/api/media/progress` endpoint to record and synchronize reader states dynamically.
    *   Implement client-side hooks inside Manga Reader and Book Reader to save and sync progress on exit, modes changes, page turn, or scroll debounce.
    *   Update the PWA Service Worker script (`public/sw.js`) to cache media assets, notes, and local API responses for offline availability.
*   **Verification**: Open an e-book or manga ZIP, progress several pages, reload or change mode, and reopen to verify the reading position is restored from the DB. Disable network connection and verify cached media assets load.

### Milestone 57: Global Settings Dialog
*   **Status**: Completed & Verified (August 2026).
*   **Goal**: Modal to configure custom quota, autosave delays, and default note editor fonts.
*   **Tasks**:
    *   Build a global Settings modal layout accessible from the bottom bar (Activity Bar on desktop) or sidebar (mobile SidebarBrowser).
    *   Provide input fields to configure custom storage quota limits, select default note editor font styles, and adjust note autosave delays in seconds.
    *   Hook up preference updates to immediately adjust the note editor font family, apply custom autosave delays, and scale the storage progress bar visualizer.
*   **Verification**: Open the settings modal, modify preferences, save, and check that visual fonts, autosave delays, and storage visualizer update immediately. All unit tests pass.

#### Milestone 58: Files Mode Card Menus, Mobile Nav, & Book Reader Improvements
*   **Status**: Completed.
*   **Goal**: Fix simultaneous card menu display, reduce mobile bottom navigation size, build a compact settings dropdown for the Book Reader, and polish mobile reader navigation.
*   **Tasks**:
    *   **Simultaneous 3-Dot Menus (Option A)**: Refactor `MediaActionsMenu` and `NoteActionsMenu` to listen to a global window event `close-actions-menus`. Before opening a menu, dispatch this event with the current item's ID as `exceptId` to close all other open instances.
    *   **Compact Mobile Navigation (Option A)**: Reduce mobile/tablet height of `ActivityBar` container in `components/activity-bar.tsx` from `h-16` to `h-12` (48px). Adjust button styling to stack contiguously on desktop (`md:h-16 md:w-full rounded-none md:gap-0 md:py-0`) and retain `h-full flex-1` on mobile for optimal touch target areas (48px height), and update mobile bottom padding in `keep-workspace.tsx` from `pb-16` to `pb-12`.
    *   **Book Reader Settings Panel (Option A)**: Refactor `components/book-reader.tsx` to group typography, layout, and theme customization selectors under a single "Settings" button. Add a floating absolute-positioned settings dropdown panel that toggle-displays these controls, adjusts width responsively on mobile, and closes automatically on click-outside.
    *   **Book Reader Mobile Tap Zones & Swipe**: Implement horizontal swipe gestures (`touchstart`/`touchend` handlers) inside the EPUB iframe and the plain text (TXT) reader. Hide chevron navigation overlay buttons entirely on mobile/touch viewports (using `hidden md:flex`) and restore desktop chevron hover functionality (`opacity-0 hover:opacity-100` transition). Keep side tap-zones active across both layouts.
    *   **Realtime Reading Progress & Node Safeguards**: Correct locations `.length()` checks in the `relocated` handler for realtime page updates (`X of Y`). Implement Text node safety checks to prevent touch taps inside iframe from throwing runtime type exceptions. Group page info and progress bar on the right side of the footer on desktop, and stacked/centered on mobile.
*   **Verification**:
    *   Open multiple 3-dot card menus; verify only one menu is open at a time.
    *   Inspect mobile viewports; verify bottom navigation height is `h-12` (48px) and tap targets span the full height.
    *   Open Book Reader; verify header controls do not wrap on mobile, settings dropdown toggles properly, and click-outside closes the dropdown.
    *   On touch/mobile simulator, verify chevron page navigation buttons are completely hidden, horizontal swipe turns pages, and side taps turn pages in both paged and scroll modes.
    *   Verify realtime updates of the `X of Y` progress bar in the footer while reading, and ensure no crashes when tapping on book texts.

### Milestone 59: Shared Reader Layout Components & Hooks
*   **Status**: Completed.
*   **Goal**: Establish the base shared UI components and hooks for both readers to prevent code duplication, mount them cleanly using React Portals, and handle fullscreen state.
*   **Tasks**:
    *   Build `ReaderContainer` component: manages full viewport overlay (`fixed inset-0 z-50`), body scroll lock (`overflow: hidden` on mount/unmount), escape key press listener to close, and HTML5 Fullscreen API toggle helper.
    *   Build `ReaderHeader` component: static dark style (`bg-[#111318]/95 border-slate-800 text-slate-100`), displays reader title, page index detail, settings toggle button, and exit button. Supports custom settings dropdown content slot.
    *   Build `ReaderFooter` component: static dark style, displays progress status (percentage read, footnote details e.g., `X of Y` pages or scroll progress bar).
    *   Build `useReaderSwipe` custom hook: captures `touchstart` and `touchend` events, detects horizontal swipe gestures, and triggers page transition callbacks. Inverts direction in RTL mode.
    *   Build `useReaderOverlay` custom hook: manages visibility of the Overlay Reader UI. Sets a timer to auto-fade controls or toggles them on viewport center tap/click (middle 40% zone).
*   **Verification**: Write Vitest tests to check that `ReaderContainer` renders, sets body class scroll lock, handles ESC press close, and that `useReaderSwipe` correctly calculates swipe directions for LTR and RTL.

### Milestone 60: Redo Manga Reader Component (Sequential Images)
*   **Status**: Completed.
*   **Goal**: Re-implement `MangaReader` using the shared overlay components and new gesture/tap interactions.
*   **Tasks**:
    *   Integrate `ReaderContainer`, `ReaderHeader`, `ReaderFooter`, and controls overlay.
    *   Add middle-tap/click overlay UI toggle (middle 40% horizontal zone).
    *   Implement LTR/RTL tap navigation (left 30% / right 30%) and LTR/RTL swipe gestures.
    *   Implement image background prefetching for LTR and RTL page indexes.
    *   Implement full Object URL lifetime tracking. Ensure all generated blob URLs are registered in a ref array and explicitly revoked using `URL.revokeObjectURL(url)` on reader close.
    *   Retain Webtoon Mode continuous scroll lazy loading with `IntersectionObserver`.
*   **Verification**: Run manga reader tests; verify pages prefetch, swipe navigation works, tapping the center toggles the header/footer overlay, and closing the reader revokes all object URLs.

### Milestone 61: Redo Book/EPUB Reader Component
*   **Status**: Completed.
*   **Goal**: Re-implement `BookReader` supporting EPUB and plain text (`.txt`) files, typography/theme settings dropdown, Table of Contents drawer, and robust progress restoring.
*   **Tasks**:
    *   Integrate `ReaderContainer`, `ReaderHeader`, `ReaderFooter`, and controls overlay. Ensure header and footer maintain standard dark styling, while only the page background changes to the active theme (Light, Sepia, Dark).
    *   Build the settings dropdown panel containing: Theme switches, Font Family selectors, Font Size selectors, Font Weight, and Line Height adjustments. Ensure dropdown closes on click-outside.
    *   Tunnel iframe clicks/taps/swipes: register event listeners in the `epubjs` rendition iframe, calculating horizontal coordinates (left 30% for prev, right 30% for next, center 40% for toggling overlay visibility) and touch swipe offsets.
    *   Implement defensive `epubjs` rendition loading: wait for `book.ready` before displaying the saved CFI. Wrap the display in a `try/catch` and fallback to `rendition.display()` on error.
    *   Re-integrate Table of Contents drawer navigation.
    *   Re-integrate TXT files scroll progress/percentage tracking and tap-to-navigate zone overlays.
    *   Connect client settings and progress to `/api/media/progress` with debounced sync on updates.
*   **Verification**: Run book reader tests; verify changing layout to scroll or paged works, settings dropdown toggles, clicking the center of the EPUB iframe toggles overlay UI visibility, and invalid CFIs fall back safely without crashing.

### Milestone 62: Book Covers & File Card Previews
*   **Status**: Completed.
*   **Goal**: Extract and display cover thumbnails on file cards for manga (ZIP/CBZ), EPUB, and PDF files, customize TXT previews, and handle general ZIPs cleanly using client-side extraction during ingestion.
*   **Tasks**:
    *   **Prisma Schema Migration**: Add `thumbnailKey` (String, nullable) to the `MediaAsset` model in `prisma/schema.prisma` and generate database migration.
    *   **In-Browser Cover Extraction Utility**: Implement a client-side library `lib/thumbnails.ts` to extract covers directly in the browser during upload:
        *   **Manga (ZIP/CBZ)**: Load ZIP index via JSZip, sort files alphanumeric-naturally using the existing `compareAlphanumeric` sorting helper, and extract the first image file.
        *   **EPUB**: Load EPUB manifest, parse container XML and `.opf` metadata to find the cover image reference, and extract it.
        *   **PDF**: Parse and render the first page of the PDF to an offscreen canvas using `pdf.js` and generate a image blob.
    *   **Upload Pipeline Integration**: Update `app/media/media-upload-control.tsx` to extract the cover blob for supported book/manga files, request a presigned R2 upload URL for the thumbnail, PUT the thumbnail blob directly to R2, and pass the thumbnail R2 key (`thumbnailKey`) when calling `createMediaAssetAction`.
    *   **Dashboard Visual Layout & Card Refinement**: Update card grid rendering in `app/vault/active-workspace.tsx` to detect `thumbnailKey`, generate the public URL, and display the cover image. Adjust book card aspect ratios to typical book dimensions (e.g., `aspect-[3/4]` or `aspect-[2/3]`) for EPUB, PDF, and manga instead of `aspect-video`.
    *   **TXT & General ZIP Previews**:
        *   For `.txt` and `.md` files, either display a stylized CSS-based card cover with the document title and a paper texture, or render a mini-preview snippet of the first few lines of the text.
        *   For general ZIP files (those that do not contain manga images), display a standard archive icon but list the top few files inside it or fall back cleanly.
*   **Verification**: Upload sample manga ZIP/CBZ, EPUB, PDF, TXT, and general ZIP files. Verify that covers are extracted client-side, uploaded, and rendered on the cards with correct aspect ratios without full-file server downloads.

### Milestone 63: Uniform File Card Layouts & Note Previews
*   **Status**: Completed.
*   **Goal**: Normalize grid layout heights in Files Mode (using standard frames and center-fitting mixed aspect ratio previews), render stylized note preview cards for Obsidian Notes, enforce Keep Note masonry constraints, and format Chat Channel attachments.
*   **Tasks**:
    *   **Uniform Grid Frames**: Modify `FolderContentsView` in `app/vault/active-workspace.tsx` to set a standard card frame height. Use CSS `object-contain` on cover/image preview elements so that vertical book covers and horizontal image/video previews fit center-aligned without stretching card containers.
    *   **Stylized Obsidian Note Cards**: Replace the default file icon in notes card thumbnails with a stylized note preview card themed in Obsidian Purple. Render a document header layout showing a snippet of the note's text body (clamped text content) rather than a fallback icon.
    *   **Keep Note Masonry Constraints**: Update `app/vault/keep-workspace.tsx` Keep card container layout to enforce a maximum card height of `max-h-72` with a fade-out gradient panel overlay at the bottom to prevent layout breaks on long text or checklists.
    *   **Format Chat Attachments**: Update `ChatWorkspace` to render non-image file attachments in a compact single-row visual format with format-specific icons (PDF, EPUB, ZIP, general files) and file sizes, keeping layout streams performant and clean.
*   **Verification**: 
    *   Upload images, PDFs, EPUBs, and notes. Verify they render side-by-side in Files Mode with identical outer card heights, and that previews fit neatly inside them.
    *   Verify Obsidian Notes in Files Mode render text snippets on a purple paper layout.
    *   Verify Keep Notes wrap with a max height of 280px (`max-h-72`) and bottom gradient fade.
    *   Verify Chat Channel file attachments render as clean, single-row formatted bars.

### Milestone 64: Configurable File Card Aspect Ratio Settings
*   **Status**: Completed.
*   **Goal**: Allow users to customize the aspect ratio shape of item cards inside the Folder Contents View grid via User Settings, selecting from Landscape, Portrait, or Square options.
*   **Tasks**:
    *   **Prisma Schema Migration**: Add `fileCardAspect` String field to the `UserSettings` database model in `prisma/schema.prisma` (defaulting to `"VIDEO"`). Generate a Prisma migration and regenerate the client.
    *   **User Settings UI Panel**: Add a settings selector dropdown in the user settings dashboard modal under a new "Files & Media Grid" section, allowing users to toggle between Landscape (16:9), Portrait (3:4), and Square (1:1).
    *   **Dynamic Grid Layout Rendering**: Update `app/vault/active-workspace.tsx` to read the active `fileCardAspect` value from settings. Dynamically bind the card's thumbnail wrapper aspect ratio class (`aspect-video`, `aspect-[3/4]`, or `aspect-square`).
    *   **Card Preview Snippet Clamp Adjustments**: Dynamically adjust the text body clamping limits for note cards based on the active aspect ratio selection so that vertical portrait cards use the extra space for a longer snippet.
*   **Verification**:
    *   Change the aspect ratio setting to Portrait in settings, save, and verify that all cards in Files Mode switch to vertical proportions with uniform heights and center-containment.
    *   Change the aspect ratio setting to Square, save, and verify cards update to uniform 1:1 boxes.
    *   Write vitest unit/integration tests covering database setting storage and dynamic workspace class rendering.

### Milestone 65: Unified Card Action Menus (Follow-up to Bulk Selection)
*   **Status**: Completed.
*   **Goal**: Split out the remaining half of the original Milestone 54: unify action overflow menus across folder, note, and media grid cards so every card offers Move, Rename, and Move to Trash from the grid.
*   **Tasks**:
    *   Add a top-right overflow menu to folder grid cards (currently menu-less) mirroring `MediaActionsMenu`.
    *   Add a top-right overflow menu to note grid cards in the Folder Contents View.
    *   Share the same underlying move/trash/rename forms across all card menus.
*   **Verification**: Right-click and overflow menus on folder and note grid cards offer Move, Rename, and Move to Trash with behavior consistent with media cards.


