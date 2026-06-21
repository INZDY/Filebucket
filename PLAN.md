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
*   **Status**: Proposed.
*   **Goal**: Remove tabs from Files Mode and fix visual indentation and item counts within the Vault Browser tree.
*   **Tasks**:
    *   **Files Mode Tabbing**: Completely hide/remove the tab bar inside Files Mode. Preview opened media assets directly in the workspace, with selecting a media file replacing the active preview layout.
    *   **Vault Tree Indentation**: Shift the base padding of `NoteRow` and `MediaRow` elements in `BrowserTree` from `12px` to `28px` (yielding `28px + depth * 16px` padding) so their file icons align perfectly under sibling and parent folder icons.
    *   **Remove Folder Children Count**: Remove children count indicator elements (`folder.count`) entirely from all folder rows (including user folders, reserved system folders, and the root `Vault` row) to achieve a clean, clutter-free sidebar.
*   **Verification**: Verify Files Mode has no tab bar and displays files directly. Verify visual icon alignment in the sidebar browser. Verify no children count is displayed on any folder rows.

### Milestone 27: Responsive Mobile Manga Reader & Sidebar Drawer Triggers
*   **Status**: Proposed.
*   **Goal**: Fix mobile Manga Reader controls, eliminate redundant drawer toggles, and optimize navigation bar padding.
*   **Tasks**:
    *   **Manga Reader Mobile Polish**: On mobile viewports (< 640px), make the Layout Mode toggles icon-only (hiding text labels) and swap the generic book icon for directional arrows: `ArrowRight` (LTR), `ArrowLeft` (RTL), and `ArrowUpDown` (Webtoon). Replace the aspect-ratio `<select>` dropdown with a single compact toggler button to switch between "Fit Width" and "Fit Height". Add max-width constraint to titles to guarantee truncation.
    *   **Sidebar Toggle Restructuring**: Remove the floating workspace drawer toggle (`PanelLeft` button) completely. Show the header hamburger toggle button on all tablet and mobile screen sizes under 1024px (`lg:hidden` instead of `md:hidden`) to serve as the unified drawer trigger.
    *   **Trash & Activity Bar Spacing**: Add a flex spacer (`hidden md:block md:flex-1`) in the Activity Bar on desktop to push the Trash icon cleanly to the bottom. Group and evenly distribute layout weights (`flex-1` for all 5 buttons) in the mobile Bottom Navigation Bar for perfect spacing.
*   **Verification**: Verify header controls do not overflow in mobile Manga Reader. Verify the floating left button is gone and the header hamburger menu toggles the sidebar on both mobile and tablet. Verify even button spacing in bottom nav.

### Milestone 28: Keep Cards Markdown Rendering & Chat Multiline Input
*   **Status**: Proposed.
*   **Goal**: Render markdown inside Keep grid cards, increase font sizes, expand editor vertical space, and support multiline chat input.
*   **Tasks**:
    *   **Keep Note Font Size**: Increase card and modal text body font sizes from `text-xs` (12px) to `text-sm` (14px) for better readability.
    *   **Markdown Keep Cards**: Parse and render standard Markdown in Keep note card grids (using a clean markdown preview renderer). Clamp notes in grid to a maximum height of `max-h-72` (280px) and apply a bottom fade-out gradient.
    *   **Responsive Columns**: Set columns dynamically: 1 column on mobile (< 640px), 2 columns on tablet (640px - 1023px), 3 columns on small desktop (1024px - 1440px), and 4 columns on wide screens (> 1440px).
    *   **Modal Height**: Increase the desktop editor modal maximum height to `95vh` to give maximum editing canvas space.
    *   **Chat Multiline Input (Shift + Enter)**: Swap the single-line `<Input>` in `ChatWorkspace` with an auto-expanding `<textarea>` (default height `h-10`, auto-growing up to `max-h-36`). Configure key events so that hitting `Enter` sends the message, and `Shift + Enter` inputs a newline (mobile keyboard default remains newline insertion).
*   **Verification**: Verify card text size and markdown support. Verify chat input handles Shift+Enter newlines, and submits on Enter.
