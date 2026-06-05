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
| Canvas Page | [canvas/](canvas/) | AI chat interface — natural-language → streaming TSX dashboards |
| Agent Pipeline | [agent-pipeline/](agent-pipeline/) | FastAPI backend for the Canvas: phases, SSE, MCP tools, caching |

> Add new domains as folders here. Each domain gets a `README.md` and topic files.

## Planning

Cross-cutting ticket plans live in [`planning/`](planning/). One file per ticket, named `PLT-XXXX-slug.md`.

| Ticket | File | Confidence |
|--------|------|-----------|
| PLT-2729 — Issues scroll + sticky search | [PLT-2729-issues-scroll-visibility.md](planning/PLT-2729-issues-scroll-visibility.md) | 7/10 |
| PLT-2731 — Issues loading performance | [PLT-2731-issues-loading-performance.md](planning/PLT-2731-issues-loading-performance.md) | 6/10 |
| PLT-2750 — Camera state on projection switch | [PLT-2750-camera-projection-modes.md](planning/PLT-2750-camera-projection-modes.md) | 8/10 |
| PLT-2751 — 360 zoom controls bug | [PLT-2751-360-zoom-slider-bug.md](planning/PLT-2751-360-zoom-slider-bug.md) | 4/10 |

Domain-specific plans live alongside their domain (e.g. `canvas/planning/`, `agent-pipeline/planning/`).

## Relationship to `docs/`

The existing `docs/` folder contains **deep technical references** (DuckDB schemas, API mappings, Mermaid diagrams).
This folder is the **entry point** — read here first, then follow links into `docs/` when you need implementation specifics.

`XYZ_AgentPipeline/docs/` has been consolidated here — all pipeline design docs and plans are now under `agent-pipeline/` and `canvas/`.
