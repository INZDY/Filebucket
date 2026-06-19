# Filebucket

**Redesign Status: In Progress. Redesigning Filebucket as a personal file vault first, and a multi-style note application second (Obsidian, Google Keep, and Discord modes).**

Filebucket is a personal hosted file vault first, and a note-taking application second. It supports three distinct note-taking experiences organized under dedicated folders, while the rest of the vault operates as general file storage:
1. **Obsidian Mode**: Long-form markdown notes and nested folders under the reserved `Notes/` folder.
2. **Google Keep Mode**: Quick note cards and checklists in a flat grid under the reserved `Quick Notes/` folder.
3. **Discord Mode**: Chronological message streams with media and link attachments under channels in the reserved `Chat Channels/` folder.

This glossary defines the product language used when discussing the domain.

## Language

**Vault**:
One user's private Filebucket space. Each user has exactly one vault. The vault root serves as the General File Storage and contains files, folders, and the three reserved system folders: `Notes/`, `Quick Notes/`, and `Chat Channels/`.
_Avoid_: Workspace, drive, library, team space

**General File Storage**:
The primary mode of the vault, active at the root level and inside any non-reserved folder. It functions as a normal file manager containing subfolders and media assets (images, PDFs, audio, archives, etc.), but does not directly contain Obsidian notes, Keep notes, or chat channels.
_Avoid_: File vault, root directory, public folder

**Keep Note**:
A specialized note that exists only as a direct child of the reserved `Quick Notes/` folder. It is rendered in a grid layout, supports background card colors, can be pinned/unpinned, and can be viewed/edited as a checklist or a simple scratchpad.
_Avoid_: Sticky note, keep card, board item

**Chat Channel**:
A folder that exists only as a direct child of the reserved `Chat Channels/` folder. It represents a Discord-style container for a stream of chat messages.
_Avoid_: Chat room, text channel, conversation

**Chat Message**:
A single chronological entry within a Chat Channel. It contains text, hyperlinks, and optional Media Asset attachments (such as screenshots or uploaded files).
_Avoid_: Chat post, message row, channel text

**Vault Browser**:
The navigation surface for browsing folders, nested folders, notes, and media assets in a vault as one mixed tree with terse explorer-style rows. Its compact creation, search, filter, and grouped upload/import controls stay reachable while the tree or result rows scroll beneath them; grouped upload/import opens a small choice before the selected file flow. The vault root should appear as `Vault` in the vault browser, while compact location breadcrumbs belong where context matters, such as active content headers or result rows, using labels such as `Vault / Projects / Plan`. Search and tag filtering filter or replace the vault browser contents, while selecting a folder sets the active creation location without replacing already opened note or media content in the main content pane. Within a location, folders sort before note and media rows, which then sort case-insensitively using natural alphanumeric sorting by visible name (e.g. `f2` sorts before `f10` rather than alphabetical). The final redesigned browser should not keep a separate folder-content section below the folder tree; folder contents belong in the mixed tree itself, with search and tag modes temporarily replacing that tree as compact result rows. An opened note or media asset should read as the strong selection state; the active creation folder may use a quieter marker. Detailed inputs show only when needed. Row actions can live in a compact overflow menu, with right-click context menus serving as a primary desktop interaction path. Folder expansion state may persist locally when practical; the initial tree can show the expanded vault root with top-level folders collapsed unless opened content needs its ancestor path revealed. An empty tree area should stay neutral while toolbar creation remains available. On narrow layouts, it may move behind a browser toggle so opened content remains primary; on desktop, its pane may be resized. The surrounding app chrome should stay slim, with account actions in a compact menu, so the vault workspace remains primary. The vault browser is UI language, not a separate domain entity.
_Avoid_: File tree, folder sidebar, explorer

**User**:
The authenticated person who owns one private vault. Users are isolated from each other; one user cannot browse another user's folders, notes, media assets, tags, or trash. Admin is setup language only and is not a separate product role for MVP.
_Avoid_: Admin, member, account, owner

**Folder**:
A user-created container inside a vault for organizing files, notes, or chat channels. In General File Storage and Obsidian Mode, folders may contain subfolders. The three root folders `Notes/`, `Quick Notes/`, and `Chat Channels/` are reserved system folders and cannot be moved, renamed, or deleted. Folders inside `Chat Channels/` represent Chat Channels and cannot contain subfolders. Folder creation inside `Quick Notes/` is blocked. A folder should not normally contain two child folders with the same case-insensitive name, or two visible notes or media assets with the same exported filename. New folder creation should use a readable suffix such as `New folder 2` on collision, then allow immediate inline Rename.
_Avoid_: Directory, collection, project

**Note**:
An Obsidian-style Markdown document owned by a user and stored inside the reserved `Notes/` folder or its subfolders (for quick/checklist notes, see Keep Note). Notes are the primary text content for Obsidian Mode. A note has a separate title; the first Markdown heading is content, not the note's identity. Active note context may show a compact vault location near the title. Note editing uses one rendered Markdown editing surface rather than separate raw Markdown write and preview modes, and Markdown formatting may normalize when saved. The rendered editor covers headings, paragraphs, emphasis, lists, task checkboxes, links, blockquotes, inline code, code blocks, and tables. Formatting controls start as a minimal toolbar and can be toggled. A note title normally becomes its exported Markdown filename. New note creation uses a readable suffix such as `Untitled 2` on collision, then immediately opens the note and focuses the title. Importing a `.md` file creates a note whose title defaults to the imported filename without `.md`, using a readable suffix on collision. Import does not parse frontmatter; frontmatter remains in the note body. Regular Markdown links and wiki-style links are plain text; Filebucket does not resolve note-to-note links, autocomplete links, maintain backlinks, or show graph relationships. Raw HTML does not execute or render unsafely. Markdown task checkboxes render; interactive toggling is a follow-up.
_Avoid_: Page, document, file note

**Media Asset**:
An uploaded item in the vault, such as an image, audio clip, video, PDF, TXT file, or other attachment. Media assets are first-class vault content: they can appear in General File Storage, inside `Notes/` folders, or be attached as files in Chat Messages. Active media context shows a compact vault location near the filename. Media asset names include their file extensions as visible filenames. Images uploaded inline from the Obsidian note editor default to a visible `Notes/Assets/` folder created when needed. Upload progress stays lightweight, and failed uploads remain visible with retry. If upload would collide with an existing visible filename, Filebucket suggests or uses a readable suffix such as `photo 2.png`.
_Avoid_: File, blob, upload

**Media Reference**:
A note's use of an existing first-class media asset from its Markdown body, such as Markdown image syntax that points to a Filebucket media asset. For MVP, the rendered note editor can upload new image media assets or choose existing image media assets through a focused image picker and show their references inline; audio and video are previewed when opened as media assets, but are not embedded inside Markdown notes. A media reference is usage, not placement or ownership; the same media asset may be referenced by multiple notes, and removing one reference does not delete the media asset.
_Avoid_: Embedded file, attachment ownership, copied media

**Trashed Media Reference**:
A media reference whose media asset is in Trash or hidden by a trashed folder. The note keeps the reference, but the media should appear unavailable until the media asset or folder is restored.
_Avoid_: Deleted embed, removed attachment, broken note

**Media Preview**:
Behavior where a user views or plays a media asset directly in Filebucket without downloading it first. MVP media preview covers simple fit-to-pane images, audio and video with browser playback controls, and in-app PDF and TXT previews within main content tabs. Navigating within a folder allows moving between active media assets of the same preview kind (e.g. image to next image, video to next video, PDF to next PDF) using on-screen chevrons, left/right arrow keys, or touch swipe gestures.
_Avoid_: Download, external viewer, attachment only

**Manga Reader**:
A fullscreen overlay utility launched from an image media preview that enables sequential image reading. It can paginate through loose images inside a folder or dynamically extract images from an uploaded ZIP or CBZ archive.
_Avoid_: Comic viewer, book reader, gallery preview

**Webtoon Mode**:
A layout configuration inside the Manga Reader that displays all image pages stacked vertically in a single continuous scrollable view.
_Avoid_: Scroll view, vertical mode

**Paged Mode**:
A layout configuration inside the Manga Reader that displays images one-by-one, supporting horizontal page navigation (Left-to-Right or Right-to-Left).
_Avoid_: Single page mode, flip mode

**Standalone Mode**:
The display setting of the PWA when launched from the home screen or dock, running the application in a borderless window without standard browser navigation bars.
_Avoid_: Fullscreen window, browser mode


**Main Content Pane**:
The primary work area where opened notes are edited as Markdown or opened media assets are previewed in lightweight tabs on a single scrollable tab row. Selecting a note opens a tab or focuses its existing tab, while selecting any media asset opens or focuses a single reusable media tab that replaces the previously previewed media asset; folder selection does not replace already opened content or create a tab. The active opened content should be restorable, while the wider open tab set may stay temporary for MVP. Note tabs protect unsaved editor state on close, while media tabs can close immediately. Before any note or media is opened, the main content pane may stay a quiet blank work surface. A broader keyboard shortcut system is a later interaction layer, not required to define MVP tab behavior. The main content pane is UI language, not a separate domain entity.
_Avoid_: Middle panel, item list, viewer

**Note Outline**:
A collapsible note-specific navigation aid generated from the active note tab's Markdown headings. The note outline appears only when a note tab is active and does not include tags, links, tasks, or media references for MVP. On narrow layouts, it can stay behind an outline toggle or start collapsed so opened content remains primary; on desktop, its pane may be resized when open. The note outline is navigation only; editing happens in the Markdown content.
_Avoid_: Right panel, table of contents, document map

**Item**:
A UI umbrella term for rows in lists or search results. Item is not a domain entity; when behavior matters, use Folder, Note, or Media Asset.
_Avoid_: Object, resource, entry

**Trash**:
A browser utility view of soft-deleted folders, notes, and media assets in a vault. Trash is not a folder or a row in the active vault tree, and entering Trash changes browser mode without clearing already opened main content tabs. Moving content to Trash keeps it restorable and preserves its original folder relationship. Trashing a note preserves its tags. Trash shows folders, notes, and media assets that were individually moved to Trash; descendants hidden only because a parent folder is trashed should not appear as separate Trash rows. Users may inspect trashed note and media content in clearly read-only main content tabs and trashed folder contents read-only, but edits, moves, and renames require restoring first.
_Avoid_: Archive, recycle bin, deleted folder

**Restore**:
Behavior that returns a trashed folder, note, or media asset to its active state. Restoring content preserves its original folder relationship.
_Avoid_: Undelete, recover, unarchive

**Permanent Delete**:
Behavior that irreversibly removes trashed content from the vault. Permanently deleting a folder also permanently deletes its descendant folders, notes, and media assets, and requires explicit confirmation.
_Avoid_: Trash, archive, remove

**Move**:
Behavior that changes the parent location of a folder, note, or media asset inside the same vault, including moving content into the vault root. Moving preserves the content's identity, tags, media references, and trash state. A folder cannot be moved into itself or any descendant folder. The mixed vault browser should support drag-and-drop move onto folders or the vault root, with menu-based Move as a fallback. Invalid or colliding drops should be rejected clearly, leave content in place, and not silently auto-rename.
_Avoid_: Copy, duplicate, relocate

**Rename**:
Behavior that changes the visible name of a folder, note, or media asset without changing its identity, content, tags, media references, trash state, or folder relationship. Rename must respect same-folder name uniqueness rules and should reject collisions instead of silently auto-suffixing.
_Avoid_: Retitle, edit filename, change path

**Folder Trash Cascade**:
Behavior where trashing a folder hides its descendant folders, notes, and media assets from active views without necessarily marking each descendant as individually trashed. Restoring the folder restores descendants that were hidden only because of that folder, but not descendants that had already been separately trashed.
_Avoid_: Recursive delete, permanent delete, orphan cleanup

**Tag**:
A user-defined label applied to notes for secondary filtering. Tags are optional: a note can have zero, one, or many tags. For MVP, tags do not apply to folders or media assets; tag filtering uses a compact vault browser filter near search and shows matching notes in the same compact browser results mode as Search, while tag assignment uses a compact active-note header control. Tag names are case-insensitively unique within a user's vault, while preserving the user's display capitalization. Renaming a tag changes its display name everywhere without changing which notes have the tag. Deleting a tag removes it from all active and trashed notes but does not delete those notes, and should require confirmation when the tag is attached to notes.
_Avoid_: Label, category, keyword

**Search**:
Whole-vault title and name matching across active folders, notes, and media assets. Search results replace the vault browser tree with compact matching rows that show visible names with location context while leaving opened main content tabs intact; searching inside note bodies is a later enhancement and should be called Full-Text Search when discussed.
_Avoid_: Full-text search, global search

**Export**:
A user-initiated download of active vault content in a portable format, requiring explicit confirmation before the download starts. MVP Export is a vault-level action suitable for the compact account or app menu rather than the vault browser toolbar. It produces one downloadable ZIP archive that preserves folder structure, writes notes as Markdown files, keeps media assets as files in their vault folder locations, rewrites Filebucket image references in Markdown notes to relative exported paths when possible, and includes a metadata manifest for extra Filebucket details such as tags, media references, media asset IDs, and original names if sanitized; it does not include Trash by default. The MVP metadata manifest is useful export metadata, not yet a stable ZIP re-import or restore contract. Export must write the stored Markdown body as Filebucket saved it, without injecting the note title as a heading. Export must avoid duplicate filenames inside each exported folder for notes and media assets, using readable automatic suffixes when needed, and may sanitize unsafe filename characters while preserving visible titles as closely as possible.
_Avoid_: Backup, sync, archive

**Backup**:
An automated or recurring preservation process for vault content. Backup is a later automation concept, not the same thing as a user-initiated export.
_Avoid_: Export, download, sync

**Autosave**:
Editing behavior where note title and body changes are saved automatically without requiring a prominent manual save command. Autosave should save after the user pauses typing for about 1500-2000ms, keep save status subtle unless a save needs attention, let affected note tabs signal unsaved or failed-save state without labeling every saved tab, and protect pending or failed saves when closing a note tab. Autosave is not a domain entity.
_Avoid_: Manual save, draft mode

## Example Dialogue

Dev: When this user signs in, which vault do they see?
Domain expert: Their own vault. Users do not switch between vaults, and they cannot browse another user's vault.

Dev: Can a note or media asset sit directly in the vault root?
Domain expert: Only media assets (files) and folders can sit directly in the vault root. Obsidian Notes must sit under `Notes/`, Keep Notes under `Quick Notes/`, and Chat Channels under `Chat Channels/`.

Dev: Can the vault root contain note `Plan` and media asset `Plan.md`?
Domain expert: No, Obsidian notes cannot sit at the vault root. They must be inside `Notes/`.

Dev: Where does a user browse files and notes?
Domain expert: In the vault browser tree. Selecting a folder or file switches the view mode and active editor/viewer in the main content pane.

Dev: What happens when a user selects a folder in the vault browser?
Domain expert: The folder becomes the active creation location. If it is within `Notes/`, the creation buttons target Obsidian notes. If it is in the general storage, they target files/subfolders.

Dev: Where does new content go after the user selects a folder?
Domain expert: Into that active folder. If no folder is active: files are created in the vault root, Obsidian notes are created in the root of `Notes/`, Keep notes are created in `Quick Notes/`, and Chat Channels are created under `Chat Channels/`.

Dev: What if the user selects a folder before opening any note or media?
Domain expert: The main content pane may stay empty because folders are browsing locations, not opened content.

Dev: Does selecting a folder open a main content tab?
Domain expert: No. Main content tabs are for opened notes and media assets.

Dev: What happens when the user selects a note that is already open?
Domain expert: Focus its existing main content tab instead of opening a duplicate tab.

Dev: Should the whole open tab set survive refresh in MVP?
Domain expert: No. Restore the active opened content, but the wider tab set may stay temporary.

Dev: Should the active creation folder look the same as the opened note?
Domain expert: No. Opened note or media content is the strong selection state; the active folder can use a quieter marker.

Dev: Should the vault browser always show creation forms?
Domain expert: No. Keep core creation commands compact and show detailed inputs only when needed.

Dev: Should every row in the vault browser show tags and dates?
Domain expert: No. Keep the mixed tree terse so folders, notes, and media stay easy to scan.

Dev: Where do browse-time rename, move, and trash actions live?
Domain expert: In a compact row overflow menu so the mixed tree stays terse.

Dev: Where should search results appear?
Domain expert: In the vault browser as compact result rows with location context, so the main content pane stays focused on the selected note or media asset.

Dev: Should the UI show `/Projects/Plan` as a breadcrumb?
Domain expert: No. Use `Vault / Projects / Plan` in the UI; filesystem-like paths are for export or technical references.

Dev: Where should tag filtering appear?
Domain expert: Near search as a compact vault browser filter that shows matching notes in browser results, with folders or media only as context.

Dev: Where does the user assign tags to a note?
Domain expert: In a compact header control for the active note, not in every vault browser row or the note outline.

Dev: Should the seeded account see admin controls?
Domain expert: No. Admin is bootstrap language only; in the product, they are just the user of their vault.

Dev: Can a folder contain another folder?
Domain expert: Yes, the domain and MVP workflows support nested folders.

Dev: Can one folder contain two visible notes named `Plan`?
Domain expert: No. Duplicate names are fine in different folders, but one folder should avoid duplicate visible names.

Dev: Can one folder contain a note titled `Plan` and a media asset named `Plan.md`?
Domain expert: No. The note exports as `Plan.md`, so those names collide inside the folder.

Dev: Can one folder contain `Plan` and `plan`?
Domain expert: No. Visible exported names are unique case-insensitively inside a folder.

Dev: Can `Work` contain child folders named `Projects` and `projects`?
Domain expert: No. Child folder names are case-insensitively unique within the same parent.

Dev: What should the second default folder be called?
Domain expert: Use a readable suffix such as `New folder 2`.

Dev: Can `Work` contain a child folder named `Plan` and a note titled `Plan`?
Domain expert: Yes. They export differently as `Plan/` and `Plan.md`.

Dev: Is `Trip plan.md` a file or a note?
Domain expert: It is a note. Uploaded binaries like images or audio are the supporting media.

Dev: Does the note editor need separate raw Markdown and preview modes?
Domain expert: No. Notes use one rendered Markdown editing surface, and saved Markdown formatting may normalize.

Dev: Does the first Markdown heading have to match the note title?
Domain expert: No. The note title and Markdown headings are separate, even if users often make them match.

Dev: How can the user tell where an open note lives after browsing elsewhere?
Domain expert: The active note can show a compact vault location near its title.

Dev: Should open media show where it lives too?
Domain expert: Yes. Active media can show a compact vault location near its filename.

Dev: Does a note title have to be a perfect filesystem filename?
Domain expert: No. Filebucket can display the original title while Export sanitizes unsafe filename characters.

Dev: Should a user title a note `Plan.md`?
Domain expert: They can, but they should not need to. Filebucket treats notes as Markdown and adds `.md` during export without duplicating the extension.

Dev: What should the second new untitled note be called?
Domain expert: Use a readable suffix such as `Untitled 2`.

Dev: What happens when a user imports `Plan.md`?
Domain expert: Filebucket creates a note titled `Plan` and uses the file contents as the Markdown body.

Dev: Does Markdown import parse frontmatter into tags or title?
Domain expert: No. Frontmatter remains in the note body for MVP.

Dev: If a note contains `[Trip Plan](Trip Plan.md)`, should Filebucket track that as a backlink?
Domain expert: No. It is regular Markdown text in the MVP.

Dev: Should `[[Trip Plan]]` auto-link to another note?
Domain expert: No. Wiki-style links are plain text in the MVP.

Dev: Should `<script>` or `<iframe>` run from a Markdown note?
Domain expert: No. Raw HTML should not execute or render unsafely in the MVP.

Dev: Is `- [ ] Buy milk` a task object?
Domain expert: No. It is Markdown text that should render as a checkbox for MVP; interactive toggling can come later.

Dev: If a receipt PDF is uploaded into a folder and later inserted into a note, is that one thing or two?
Domain expert: It is one media asset with folder and note associations.

Dev: Does inserting an image into a note create hidden note-owned media?
Domain expert: No. It creates or uses a first-class media asset, then the note references it. Inline editor uploads default to the visible vault-level `Assets` folder.

Dev: Can a media asset exist without a folder or note?
Domain expert: No. It must live in the vault root or a folder. A note can reference it, but does not contain or place it.

Dev: Can a user open an audio recording without inserting it into a note first?
Domain expert: Yes. Media assets are first-class vault content and can be opened directly.

Dev: Should an uploaded image display as `photo` or `photo.png`?
Domain expert: `photo.png`. Media asset extensions are part of their visible filenames.

Dev: Is an uploaded `log.txt` a note?
Domain expert: No. Uploaded TXT files are media assets; notes are Markdown documents created and edited in Filebucket.

Dev: What if a user uploads `photo.png` where `photo.png` already exists?
Domain expert: Filebucket should suggest or use a readable suffix like `photo 2.png`.

Dev: If a note stops referencing an image, should the image be deleted?
Domain expert: No, not if the media asset still belongs to a folder or is referenced by another note.

Dev: Are Markdown image references handled like normal Markdown links?
Domain expert: No. Image references to Filebucket media assets are supported media references; note-to-note links are plain Markdown text in the MVP.

Dev: Should an audio file render as a player inside a note?
Domain expert: Not in the MVP. Open the audio media asset to play it in the main content pane.

Dev: If two notes use the same logo image, is that one media asset or two?
Domain expert: One media asset with two media references.

Dev: Should trashing an image remove its Markdown from notes?
Domain expert: No. The note keeps the media reference so restoring the media asset makes it available again.

Dev: Should Filebucket warn before trashing media used by notes?
Domain expert: Yes. If active notes reference the media asset, the user should be warned that those references will appear unavailable.

Dev: Should trashing a folder warn if outside notes use media inside it?
Domain expert: Yes. If active notes outside the folder reference media inside it, the user should be warned that those references will appear unavailable.

Dev: What happens when a user opens an audio media asset?
Domain expert: Filebucket should let the user play it directly as a media preview.

Dev: Does MVP need to preview PDFs in-app?
Domain expert: No. PDFs and TXT files can be stored as media assets now; their previews are future features.

Dev: What should the right side show when a video is selected?
Domain expert: Nothing note-specific. The note outline only appears when a note is selected.

Dev: What happens to the note outline when a media tab becomes active?
Domain expert: It disappears because the outline follows the active note tab only.

Dev: Should checklist items appear in the note outline?
Domain expert: No. The MVP note outline is generated from Markdown headings only.

Dev: Can a user rename a heading from the note outline?
Domain expert: Not in the MVP. The outline navigates; headings are edited in the Markdown content.

Dev: Should the restore rule say restore items?
Domain expert: Only in UI copy. Domain rules should name the affected things, such as notes and folders.

Dev: Is Trash a folder in the mixed vault tree?
Domain expert: No. Trash is a browser utility destination outside the active vault tree.

Dev: Does entering Trash close open note or media tabs?
Domain expert: No. Trash changes the browser mode without clearing already opened main content tabs.

Dev: How does a trashed note open for inspection?
Domain expert: In a clearly read-only main content tab with restore-focused actions.

Dev: If a note from `Projects` is moved to Trash and restored, where does it go?
Domain expert: Back to `Projects`, because Trash did not change the note's original folder relationship.

Dev: Does a trashed note lose its tags?
Domain expert: No. Tags are preserved, and restored notes return with the same tags.

Dev: Is moving a note to Trash permanent?
Domain expert: No. Permanent Delete is a later behavior that removes trashed content irreversibly.

Dev: What happens if a trashed folder is permanently deleted later?
Domain expert: Its descendant folders, notes, and media assets are permanently deleted too, after explicit confirmation.

Dev: What changes when a note moves from `Inbox` to `Projects`?
Domain expert: Only its folder relationship. The note keeps its identity, tags, body, and media references.

Dev: What if `Projects` already has a note named `Plan`?
Domain expert: Moving another `Plan` note there should be blocked until the user renames it or chooses another destination.

Dev: Can `Projects` move into `Projects/Archive`?
Domain expert: No. A folder cannot move into itself or one of its descendants.

Dev: What changes when a note is renamed from `Plan` to `Roadmap`?
Domain expert: Only its visible title and exported filename. The note keeps the same identity, content, tags, and relationships.

Dev: What if a user renames `Roadmap` to an existing `Plan`?
Domain expert: Reject the rename and ask for a unique name instead of silently creating `Plan 2`.

Dev: Should media assets be restorable too?
Domain expert: Yes. A trashed media asset should be restorable just like a trashed folder or note.

Dev: If a folder is trashed and then restored, should every note inside it come back?
Domain expert: Notes hidden only because the folder was trashed should come back. Notes already trashed on their own should stay in Trash.

Dev: Should Trash list every note inside a trashed folder?
Domain expert: No. Show the trashed folder; list notes or media separately only when they were individually moved to Trash.

Dev: Can a user open a trashed folder before restoring it?
Domain expert: Yes, for read-only inspection. Editing, moving, or renaming requires restoring first.

Dev: Should trip photos be tagged one by one?
Domain expert: Not in the MVP. Tag the related note; media asset tagging can be designed later if needed.

Dev: Does every note need a tag?
Domain expert: No. Tags are optional secondary filters.

Dev: What happens when Search and a tag filter are both active?
Domain expert: Results narrow to notes matching both the tag and the search text; media assets do not independently match tag filters.

Dev: Can one vault have tags named `Travel` and `travel`?
Domain expert: No. Tag names are case-insensitively unique within a user's vault.

Dev: If a user creates `Trip Ideas`, should Filebucket display `trip ideas`?
Domain expert: No. Preserve the user's capitalization for display while matching case-insensitively.

Dev: What happens when a tag is renamed from `Trip` to `Travel`?
Domain expert: Notes keep the same tag relationship; the tag displays as `Travel` everywhere.

Dev: Does deleting a tag delete tagged notes?
Domain expert: No. It removes the tag from active and trashed notes; the notes remain.

Dev: A note titled `Ideas` contains the word `recipe`; should Search find it by `recipe`?
Domain expert: Not unless `recipe` appears in the note title or folder name. That would require Full-Text Search.

Dev: Should Search find `meeting.m4a`?
Domain expert: Yes. Media asset filenames are included in MVP Search.

Dev: If a user searches while browsing `Projects`, can results from `Finance` appear?
Domain expert: Yes. MVP Search searches the whole vault by default.

Dev: Should normal Search find a trashed note?
Domain expert: No. Search includes active content by default.

Dev: Is clicking a button to download Markdown files a backup?
Domain expert: No, that is an export. Backup means the app preserves copies automatically or on a recurring schedule.

Dev: What should MVP Export download?
Domain expert: One ZIP archive containing the folder structure, Markdown notes, media assets, and metadata manifest.

Dev: Should Export include notes in Trash?
Domain expert: Not by default. Export should represent active vault content unless an explicit include-Trash option is added later.

Dev: What should an exported note look like outside Filebucket?
Domain expert: It should be a Markdown file inside the exported folder structure, with metadata used only for extra Filebucket details.

Dev: What happens to Filebucket image references during Export?
Domain expert: Rewrite them to relative paths pointing to the exported media files when possible.

Dev: Should Export add `# Trip Plan` to a note body?
Domain expert: No. Export writes the Markdown body as Filebucket saved it; the note title becomes the filename.

Dev: What if two exported things would have the same filename in one folder?
Domain expert: Export should keep names readable and add automatic suffixes, such as `Plan.md` and `Plan 2.md`.

Dev: Does a user need to click Save after editing a note?
Domain expert: No. Autosave should preserve note title and body changes while the user edits.
