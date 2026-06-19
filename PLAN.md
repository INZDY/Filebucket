# Filebucket Redesign Plan

This plan outlines the roadmap to transform Filebucket from a single-mode Obsidian-inspired vault into a personal file vault first, and a multi-style note application second (Obsidian, Google Keep, and Discord modes).

---

## Redesign Milestones

### Milestone 17: Database Schema Extension & Seed Data
*   **Goal**: Update the data model to support Keep card styling and Discord-style text channels.
*   **Tasks**:
    *   Add `color` (String?) and `isPinned` (Boolean, default false) to the `Note` model in `prisma/schema.prisma`.
    *   Create the `ChatMessage` model with relations to `User` and `Folder`.
    *   Add `chatMessageId` (String?) and relation to `MediaAsset`.
    *   Generate a database migration and update the database seeds/mocks to set up initial reserved folders (`Notes`, `Quick Notes`, `Chat Channels`) and a sample channel/quick note.
*   **Verification**: Run Prisma client generation and check database connections; verify seeded data compiles.

### Milestone 18: Activity Bar Navigation & Dynamic Sidebar
*   **Goal**: Implement the leftmost navigation strip and dynamic view switching.
*   **Tasks**:
    *   Create an Activity Bar component containing icons for Files, Obsidian Notes, Quick Notes, and Chat Channels.
    *   Update `SidebarBrowser` to dynamically switch its content based on the selected mode:
        *   **Files Mode**: General Vault tree.
        *   **Obsidian Mode**: `Notes/` subfolders/notes tree.
        *   **Keep Mode**: Flat list of Tag filters for Keep cards.
        *   **Chat Channels Mode**: Flat list of Chat Channels under the `Chat Channels/` folder.
*   **Verification**: Click each icon in the Activity Bar and verify the sidebar updates to show the correct content tree/filters.

### Milestone 19: Google Keep Mode (Card Grid & Modal Editor)
*   **Goal**: Create a rich, authentic Google Keep workspace for quick notes and scratchpads.
*   **Tasks**:
    *   Build a masonry/responsive card grid workspace in the Main Content Pane when in Keep mode.
    *   Implement "Pinned" and "Others" sections.
    *   Build the top "Take a note..." inline creation bar with text and checklist options.
    *   Build a Card Edit Modal supporting title/body editing, interactive checklist toggles, card color picker, tags, and deletion.
    *   Hook up card changes to autosave.
*   **Verification**: Create notes, pin/unpin cards, change colors, toggle checklists, and edit cards in the modal; verify updates persist.

### Milestone 20: Discord Mode (Chat Channel Stream)
*   **Goal**: Create a chronological chat channel stream for short text messages and media captures.
*   **Tasks**:
    *   Build the Chat Panel workspace in the Main Content Pane when in Chat Channels mode.
    *   Render messages chronologically with timestamps and sender headers.
    *   Implement auto-hyperlinking and basic link/attachment previews (images displayed inline, other files as downloadable cards).
    *   Build a message input bar at the bottom with a file upload button (`+` icon) for attaching Media Assets.
    *   Allow message deletion on hover.
*   **Verification**: Type and send messages, upload images, click links, and delete messages; verify that attachments are created as `MediaAsset`s linked to the chat message.

### Milestone 21: General File Storage & Boundary Validation
*   **Goal**: Enforce system folder rules and lock down the general file explorer.
*   **Tasks**:
    *   Make `Notes/`, `Quick Notes/`, and `Chat Channels/` reserved folders at the vault root. Disable rename, move, and delete actions on them.
    *   Show custom, styled icons in the vault browser for reserved folders.
    *   Enforce boundaries:
        *   Block note creation in Files Mode (Files Mode only allows folders/media assets).
        *   Enforce that all notes created under Obsidian Mode go inside `Notes/`.
        *   Block folder creation inside `Quick Notes/`.
        *   Block subfolders inside chat channels under `Chat Channels/`.
*   **Verification**: Attempt to rename reserved folders, create notes in Files root, or create folders in Quick Notes; verify all are rejected with clear error messages.

### Milestone 22: Testing & Hardening
*   **Goal**: Verify the stability, responsiveness, and performance of the hybrid vault system.
*   **Tasks**:
    *   Write Vitest component and logic tests covering view mode switching, validation constraints, and database relations.
    *   Verify drag-and-drop actions are locked down correctly for reserved folders.
    *   Ensure PWA offline caching works for the new routes and APIs.
*   **Verification**: All tests pass.
