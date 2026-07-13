# Agent Instructions

This repository is documented for AI-assisted development.

Before changing code, read:

- `CHATGPT.md` for the full architecture, product rules, data model, workflows, and testing commands.
- The specific files in the feature you will modify.
- Supabase migrations and services when touching database-backed behavior.

Core rules:

- Use `rg` for search.
- Keep changes scoped to the requested feature.
- Do not revert unrelated user changes.
- Use `apply_patch` for manual edits.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` after meaningful code changes.
- For Supabase schema changes, create a local migration with `npx supabase migration new <name>` and apply/verify the remote change through the Supabase connector when available.

