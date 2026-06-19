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
*   **Goal**: Verify the stability, responsiveness, and performance of the hybrid vault system.
*   **Tasks**:
    *   Write Vitest component and logic tests covering view mode switching, validation constraints, and database relations.
    *   Verify drag-and-drop actions are locked down correctly for reserved folders.
    *   Ensure PWA offline caching works for the new routes and APIs.
*   **Verification**: All tests pass.
