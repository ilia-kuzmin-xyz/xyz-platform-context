# xyz-platform-context

High-level domain documentation for XYZ Reality's HoloConstruct platform.
Aimed at **developers joining the project** and **AI copilots** that need architectural context to make informed code changes.

## Conventions

| Guideline | Why |
|-----------|-----|
| Keep files **concise** — explain the "what" and "why", link out for deep details | Avoids stale duplicates of implementation docs |
| Note **pitfalls** and **gotchas** explicitly | Saves hours of debugging |
| Include **goals** and **planned work** | Gives direction even when Jira is unavailable |
| Use plain language over code | This isn't API reference; it's conceptual grounding |

## Domains

| Domain | Path | Description |
|--------|------|-------------|
| Dashboard Page | [dashboard/](dashboard/) | In-browser analytics + 3D viewer replacing PowerBI |

> Add new domains as folders here. Each domain gets a `README.md` and topic files.

## Relationship to `docs/`

The existing `docs/` folder contains **deep technical references** (DuckDB schemas, API mappings, Mermaid diagrams).
This folder is the **entry point** — read here first, then follow links into `docs/` when you need implementation specifics.
