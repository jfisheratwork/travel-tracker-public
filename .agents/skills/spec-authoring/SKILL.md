---
name: spec-authoring
description: Standardizes drafting, decomposing, and validating new feature specifications under ./specs/SPEC-NNN-Title.md and syncing with living architecture docs.
---

# Specification Authoring & Architecture Sync Skill

Use this skill when initiating a new feature, GIS/mapping enhancement, state schema update, or refactoring workflow in compliance with Rule 10 of `AGENTS.md`.

## 1. Spec Numbering & Naming

1. Inspect `./specs/` to find the highest existing specification number (e.g., `SPEC-001`).
2. Create the new proposal at `./specs/SPEC-<next_id>-<Pascal-Kebab-Title>.md`.

## 2. Canonical Spec Structure

Every specification document must include these sections:

1. **Metadata Header**:
   - Status (`Draft` | `Approved` | `Implemented`)
   - Date (`YYYY-MM-DD`)
   - Affected Domains (`02-state-and-data-flow`, `03-map-and-gis-architecture`, `04-component-catalog`, `05-external-apis-and-network`, `08-v4-places-and-trips-design`, etc.)
2. **Problem Statement & Motivation**:
   - Concrete user, UX, or GIS/state gap addressed by the change.
3. **Behavioral & Architectural Specification**:
   - Explicit GIS/coordinate rules, RxJS reactive state transitions, or Angular component/modal layout constraints.
   - Edge cases (e.g., partial family visits, offline/timeout routing fallbacks, custom OSM places, V1–V4 schema migration compatibility).
4. **Data Model & State Contract Changes**:
   - Exact properties added or migrated in `src/app/models/`, `StateService`, `LocalStorageService`, and `architecture/02-state-and-data-flow.md`.
5. **Decomposition & Verification Plan**:
   - Vitest unit test cases to add in `src/app/**/*.spec.ts`.
   - Browser/UI checks and developer console verification requirements on `http://localhost:4200`.
   - Living architecture files under `architecture/*.md` that require updates upon completion.

## 3. Pre-Implementation Gate

1. Run `make lint-skills` and `make lint-prose` on the newly drafted spec file.
2. Link the spec at the top of `implementation_plan.md`.
3. Pause for explicit user approval before modifying application source code.
