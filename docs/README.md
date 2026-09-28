# docs/

Product and project documentation. Two kinds of content live here:

## `docs/agents/`

Conventions for AI agents and the engineering skills. These are configuration, not product docs:

- `issue-tracker.md` — where issues live (GitHub, via `gh`) and the operations skills run against it.
- `triage-labels.md` — maps the five canonical triage roles to this repo's label strings.
- `domain.md` — which domain docs to read before exploring, and how to use their vocabulary.

`AGENTS.md` at the repo root points at these. The domain glossary itself lives in `CONTEXT.md`, and hard decisions live in `docs/adr/`.

## `docs/` (everything else)

Product documentation about how Filebucket is built and operated — for example `storage-configuration.md` (R2/S3 CORS setup for client-side archive decompression).
