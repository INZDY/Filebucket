# PostgreSQL stores Markdown notes for MVP

Filebucket treats notes as Markdown documents, but MVP stores note titles and Markdown bodies in PostgreSQL rather than as `.md` objects in blob storage. This keeps autosave, user isolation, tags, trash, search metadata, and note workflows close to the relational data model while preserving `.md` files as the import and export boundary for portability.
