# Filebucket Redesign Plan

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
    *   **Files Mode Tabbing**: Completely hide/remove the tab bar inside Files Mode. Preview opened media assets directly in the workspace, with selecting a media file replacing the active preview layout.
    *   **Vault Tree Indentation**: Shift the base padding of `NoteRow` and `MediaRow` elements in `BrowserTree` from `12px` to `28px` (yielding `28px + depth * 16px` padding) so their file icons align perfectly under sibling and parent folder icons.
    *   **Remove Folder Children Count**: Remove children count indicator elements (`folder.count`) entirely from all folder rows (including user folders, reserved system folders, and the root `Vault` row) to achieve a clean, clutter-free sidebar.
*   **Verification**: Verify Files Mode has no tab bar and displays files directly. Verify visual icon alignment in the sidebar browser. Verify no children count is displayed on any folder rows.

### Milestone 27: Responsive Mobile Manga Reader & Sidebar Drawer Triggers
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Fix mobile Manga Reader controls, eliminate redundant drawer toggles, and optimize navigation bar padding.
*   **Tasks**:
    *   **Manga Reader Mobile Polish**: On mobile viewports (< 640px), make the Layout Mode toggles icon-only (hiding text labels) and swap the generic book icon for directional arrows: `ArrowRight` (LTR), `ArrowLeft` (RTL), and `ArrowUpDown` (Webtoon). Replace the aspect-ratio `<select>` dropdown with a single compact toggler button to switch between "Fit Width" and "Fit Height". Add max-width constraint to titles to guarantee truncation.
    *   **Sidebar Toggle Restructuring**: Remove the floating workspace drawer toggle (`PanelLeft` button) completely. Show the header hamburger toggle button on all tablet and mobile screen sizes under 1024px (`lg:hidden` instead of `md:hidden`) to serve as the unified drawer trigger.
    *   **Trash & Activity Bar Spacing**: Add a flex spacer (`hidden md:block md:flex-1`) in the Activity Bar on desktop to push the Trash icon cleanly to the bottom. Group and evenly distribute layout weights (`flex-1` for all 5 buttons) in the mobile Bottom Navigation Bar for perfect spacing.
*   **Verification**: Verify header controls do not overflow in mobile Manga Reader. Verify the floating left button is gone and the header hamburger menu toggles the sidebar on both mobile and tablet. Verify even button spacing in bottom nav.

### Milestone 28: Keep Cards Markdown Rendering & Chat Multiline Input
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Render markdown inside Keep grid cards, increase font sizes, expand editor vertical space, and support multiline chat input.
*   **Tasks**:
    *   **Keep Note Font Size**: Increase card and modal text body font sizes from `text-xs` (12px) to `text-sm` (14px) for better readability.
    *   **Markdown Keep Cards**: Parse and render standard Markdown in Keep note card grids (using a clean markdown preview renderer). Clamp notes in grid to a maximum height of `max-h-72` (280px) and apply a bottom fade-out gradient.
    *   **Responsive Columns**: Set columns dynamically: 1 column on mobile (< 640px), 2 columns on tablet (640px - 1023px), 3 columns on small desktop (1024px - 1440px), and 4 columns on wide screens (> 1440px).
    *   **Modal Height**: Increase the desktop editor modal maximum height to `95vh` to give maximum editing canvas space.
    *   **Chat Multiline Input (Shift + Enter)**: Swap the single-line `<Input>` in `ChatWorkspace` with an auto-expanding `<textarea>` (default height `h-10`, auto-growing up to `max-h-36`). Configure key events so that hitting `Enter` sends the message, and `Shift + Enter` inputs a newline (mobile keyboard default remains newline insertion).
*   **Verification**: Verify card text size and markdown support. Verify chat input handles Shift+Enter newlines, and submits on Enter.

### Milestone 29: Sidebar Resizability & Persistence
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Persist the width of the resizable Vault Browser panel and support fallback minimum size.
*   **Tasks**:
    *   **Width Persistence**: In `ResizableVault`, store the resized browser panel percentage or pixel width in `localStorage` (using key `filebucket_sidebar_width`).
    *   **Hydration-Safe Restore**: Read the stored width in a `useEffect` after mounting to prevent SSR hydration mismatches, then apply the size dynamically to the `<Panel>` component.
    *   **Minimum Default Size**: If no width has been saved in `localStorage`, default the sidebar size to its minimum possible width (e.g., `280px` or minimum percentage size).
*   **Verification**: Resize the sidebar, reload the page, and verify the width is preserved. Clear `localStorage` and verify the sidebar defaults to its minimum width.

### Milestone 30: Files Mode Folder-Only Tree & Special Folders Visibility Toggle
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Show folders only in Files Mode tree and implement a toggle to hide or show special reserved folders.
*   **Tasks**:
    *   **Folder-Only Filtering**: In Files Mode, update `BrowserTree` to filter out notes and media assets so that only the folder tree structure is shown.
    *   **Special Folders Toggle**: Add a "Show/Hide Special Folders" button or icon to the vault browser toolbar when in Files Mode.
    *   **Default Behavior**: Default the toggle to **hide** special folders (`Notes/`, `Quick Notes/`, `Chat Channels/`) at the root level.
    *   **State Persistence**: Store the toggle state in `localStorage` so it persists across page reloads.
*   **Verification**: Enter Files Mode and verify no note or media rows are displayed in the tree. Verify that the `Notes/`, `Quick Notes/`, and `Chat Channels/` directories are hidden by default. Click the toggle to show them and verify they appear, then refresh the page and verify the state is preserved.

### Milestone 31: Main Content Pane Folder Contents View (Files Mode)
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Render all contents of the selected folder in the main content panel in Files Mode.
*   **Tasks**:
    *   **Folder Contents Display**: When in Files Mode and a folder (or root) is active with no media preview open, render a `FolderContentsView` grid/list in the Main Content Pane.
    *   **Mixed Child Listing**: Retrieve and render all direct children of the selected folder: subfolders (with custom icons), notes, and media assets.
    *   **Navigation & Actions**:
        *   Clicking a folder navigates the Vault Browser into that folder.
        *   Clicking a media asset opens its preview in the Main Content Pane.
        *   Clicking a note switches the mode to Obsidian Notes and opens the note.
    *   **Empty State**: Handle empty folder states cleanly with helpful design.
*   **Verification**: Click a folder in Files Mode tree. Verify the main content pane displays the items inside it. Click a subfolder in the grid to navigate deeper. Click a file to preview it. Click a note to switch to notes mode and edit it.

### Milestone 32: Tree Views Topmost Root Hiding
*   **Status**: Completed & Verified (June 2026).
*   **Goal**: Hide the topmost root header in the tree browser for a cleaner presentation.
*   **Tasks**:
    *   **Topmost Row Removal**: Update `BrowserTree` to omit rendering the topmost folder row (which shows "Vault", "Notes", or "Chat Channels" as the root node).
    *   **Direct Child Rendering**: Render the first-level children of the root folder directly at the top level of the tree (with appropriate indentation).
    *   **Root Drag & Drop Support**: Ensure the vault root drop zone remains operational so items can still be dragged and dropped into the root.
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
*   **Status**: Planned.
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
*   **Status**: Planned.
*   **Goal**: Set up Tiptap editor engine supporting native markdown serialization, mixed lists/paragraphs, and checked items auto-sorting.
*   **Tasks**:
    *   Install Tiptap core dependencies (`@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`) and `tiptap-markdown` for markdown conversions.
    *   Create a modular `FilebucketEditor` component wrapping the Tiptap canvas.
    *   Configure `FilebucketEditor` to parse markdown shortcuts dynamically (`# `, `* `, `1. `, `[ ] `).
    *   Implement an event trigger or Tiptap extension to auto-sort checked checklist items to the bottom of their parent `taskList` block.
    *   Set up visual rendering styles in `app/globals.css` matching the design system (headings, bold, lists).
*   **Verification**: Run tests on the editor wrapper; verify typing shortcuts yields styled tags inline and that checking a task item moves it to the bottom of the list block.

### Milestone 39: Replace Markdown Editors in Obsidian & Keep Workspaces
*   **Status**: Planned.
*   **Goal**: Integrate Tiptap editor into Notes Mode and Keep Mode modal/creation forms using Next.js dynamic imports.
*   **Tasks**:
    *   Replace Milkdown Crepe in `app/notes/note-editor.tsx` with the new `FilebucketEditor` component.
    *   Connect inline image picker assets insertion so that images serialize as `![filename](filebucket-media:id)` inside Tiptap.
    *   Replace the raw `<textarea>` and checklist inputs in `app/vault/keep-workspace.tsx` (edit modal and creation card) with the Tiptap editor.
    *   Apply Amber styling variables to Tiptap checklist task elements in Keep Mode.
    *   Wrap editor loads with `next/dynamic` (`ssr: false`) to optimize initial page loading.
*   **Verification**: Open a markdown note in Obsidian mode and verify Tiptap renders and saves note edits. Open a Keep card and verify mixed checklist and paragraph editing works, checkbox toggles work, and files don't block initial SSR loading.

### Milestone 40: Client-Side Selection State & Shallow Routing
*   **Status**: Planned.
*   **Goal**: Eliminate full server-side page fetches on item navigation by using client selection states and shallow routing.
*   **Tasks**:
    *   Refactor active selection parameter checks in `app/page.tsx` and workspaces.
    *   Load the directory tree layout structure once on mount. On row clicks inside `SidebarBrowser`, update client-side selection state dynamically.
    *   Use `window.history.pushState` or dynamic query string replacements to synchronize parameters (`?folder=...&note=...`) client-side without executing server-side route re-renders.
    *   Expose clean API routes (`/api/notes/[id]` and `/api/folders/[id]`) to dynamically fetch note data and folder items details on client state changes.
*   **Verification**: Click folders and notes in the sidebar tree. Verify navigation is instantaneous, URL parameters update in the address bar, and note details load dynamically without full-page server round-trips.

### Milestone 41: Optimistic UI Updates & Transition Hardenings
*   **Status**: Planned.
*   **Goal**: Ensure action responses (renaming, trashing, checking, pinning) feel instantaneous to the user.
*   **Tasks**:
    *   Implement optimistic UI updates for Keep card updates (checkbox state toggles, pin states, card colors, tag associations).
    *   Implement optimistic UI updates for folder explorer row operations (inline rename, trash, moves).
    *   Add smooth fade/slide CSS transitions and content skeletons to the workspace pane to mask dynamic API data fetches.
*   **Verification**: Perform folder renames, keep note pinning, and checklist checkmarks; verify UI updates instantly in the browser without waiting for server responses. Check that loading skeletons show gracefully during load times.
