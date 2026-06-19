# Hybrid Vault with Obsidian, Keep, and Discord Modes

Filebucket is redesigned as a personal file vault first, and a multi-style note application second. To accommodate different note-taking styles, we introduce three special reserved folders at the vault root: `Notes/` (for Obsidian-style long-form markdown), `Quick Notes/` (for Google Keep-style grid of card scratchpads/checklists), and `Chat Channels/` (for Discord-style text streams and media uploads). Any other root or non-reserved folder acts as general file storage (Files Mode).

This architecture replaces a single unified Obsidian-style workspace. The trade-off is higher application complexity, but it fulfills the distinct workflows of long-form knowledge writing, rapid sticky-note checklists, and chat-based logging (links/screenshots) in a single integrated vault space.
