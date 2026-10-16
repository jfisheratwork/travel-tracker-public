# AI Agent Rules & Governance

Mandatory operational rules and architectural constraints for AI agents working on Travel Tracker.

## 1. Strict Approval & External Command Security

- **Explicit Plan Approval:** Pause execution after presenting an `implementation_plan.md` and wait for explicit user approval before writing implementation code.
- **External Command Approval:** Never execute non-readonly external commands (`git push`, PR creation, deployments, external API writes) without explicit user approval. Propose the exact command, state its impact, and wait for confirmation.

## 2. Attribution, Code & Documentation Hygiene

- **Commit & PR Attribution:** Append this footer to all AI-assisted commit messages and PR descriptions:
  > Written with the assistance of Google Gemini
- **UserWalkthrough.md:** Update `UserWalkthrough.md` in the workspace root (git-ignored) with verification screenshots when UI features change.
- **local_only/ Quarantine:** Store personal backups, legacy specs (`local_only/openspec/`, `local_only/future_ideas/`), and scratch notes (`local_only/todo.md`) strictly inside `local_only/`. Remove completed items from `local_only/todo.md` once documented in `architecture/`.
- **Code Hygiene & YAGNI:** Before completing a task, strip unrequested helper functions, speculative abstractions, and dead code from touched files. Replace loose types (`any`, generic `object`) with domain interfaces, and place official documentation links above newly introduced APIs.
- **Project-Relative Markdown Links:** All Markdown links to repository files and documentation must be project-relative, never machine-relative (`file:///`, `/Users/`, `/home/`).

## 3. Session Management

- **Session Directories:** Create `my_sessions/YYYY-MM-DD-Session-{n}/` (incrementing `{n}` from 1 per day) at the start of every session, new feature branch, or post-PR task.
- **session_summary.md:** Maintain `my_sessions/YYYY-MM-DD-Session-{n}/session_summary.md` and update it only when committing or pushing. Required sections:
  1. **Executive Summary:** Goals and results overview.
  2. **Outcomes:** Specific milestones and deliverables achieved.
  3. **Fine-grained Details:** Technical breakdown of `Tasks Done` and `Tasks Not Done`.
  4. **Prompt Log:** Chronological summary of user prompts and requests.
- **Harness Retrospective:** At session wrap-up or PR preparation, inspect transcripts and git diffs to:
  1. Propose `Makefile` targets for multi-step commands executed 3+ times.
  2. Author `ast-grep` rules in `.agents/ast-grep-rules/` for recurring syntax or structural errors.
  3. Record new architectural invariants in `architecture/*.md`.

## 4. File System Boundaries & Tooling Hooks

- **Workspace Confinement:** Never modify files outside the repository root, inside `.git/` (unless running an approved git command), or in user home/system directories.
- **PostToolUse Hook (`scripts/post-tool-quality.js`):** Runs syntax, ESLint, and `ast-grep` checks automatically on every `write_to_file` or `replace_file_content` edit via `.agents/hooks.json`. Do not run redundant single-file `npx eslint` commands when the hook passes.
- **Task Completion Gate:** Run `make repchecks` when a feature or multi-file change is complete, or immediately if the PostToolUse hook reports warnings.

## 5. Tri-Tier Code Navigation: LSP, AST Analysis (`ast-grep`), and Fast Search

1. **Tier 1 — LSP Bridge (`lsp-bridge` MCP)**:
   - Use `lsp_find_symbol`, `lsp_goto_definition`, `lsp_find_references`, `lsp_file_exports`, and `lsp_file_imports` to resolve TypeScript/Angular symbols before reading full files.
   - _Decorator Trap Warning_: NEVER call `lsp_find_references` on framework decorators (`@Injectable`, `@Component`, `@Output`). This scans `node_modules` and hangs the language server. Target the class or method identifier line/column.
2. **Tier 2 — AST Search (`ast-grep`)**:
   - Run `ast-grep outline --view expanded <path>` on unfamiliar files to get line-numbered structural outlines before calling `view_file`.
   - Use `find_code` MCP, `sg run -p '<pattern>'`, or `make lint-rules` to locate method signatures, class members, or structural patterns.
3. **Tier 3 — Text Search (`ripgrep` / `rg`)**:
   - Use `rg` only for literal strings, CSS selectors, HTML IDs, and Markdown text. Use `ast-grep` or `lsp-bridge` when AST context or call hierarchy is required.
4. **Refactoring & Type Checks**:
   - Prefer `lsp_rename`, `ast-grep --rewrite`, `npx eslint --fix`, and Prettier over manual find-and-replace.
   - Map callsites with `lsp_find_references` or `sg run -p '<symbol>($$$)'`, apply edits modularly, and verify with `lsp_diagnostics(file_path)` and `make repchecks`.

## 6. External Libraries & Dependency Inventory

1. **Explicit Versioning:** Pin exact versions in `package.json` and CDN links. Never use `@latest`, `latest`, or `*` ranges.
2. **Documentation Link:** Add a code comment with the official release notes or documentation URL above the first usage of any external library or Angular API in a file.
3. **5-Day Cooldown:** Check for library updates at session start. Only upgrade to versions publicly released at least 5 days prior.

### Project Dependency Inventory

| Type             | Package / Asset                       | Version              | Release Notes / Documentation                                                | Purpose                                                     |
| :--------------- | :------------------------------------ | :------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **Framework**    | `@angular/core` (& platform packages) | `21.2.23`            | [Angular Releases](https://github.com/angular/angular/releases/tag/21.2.23)  | Standalone component framework and dependency injection     |
| **Map Engine**   | `leaflet`                             | `1.9.4`              | [Release v1.9.4](https://github.com/Leaflet/Leaflet/releases/tag/v1.9.4)     | Interactive GIS map rendering, GeoJSON shading, and markers |
| **Reactivity**   | `rxjs`                                | `7.8.0`              | [Release 7.8.0](https://github.com/ReactiveX/rxjs/releases/tag/7.8.0)        | Reactive state streams (`BehaviorSubject`, `Observable`)    |
| **Unit Testing** | `vitest`                              | `4.1.11`             | [Release v4.1.11](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11) | Fast unit test execution for services and components        |
| **E2E Testing**  | `@playwright/test`                    | `^1.61.1`            | [Playwright Releases](https://github.com/microsoft/playwright/releases)      | Headless browser E2E verification                           |
| **Linter**       | `eslint` / `typescript-eslint`        | `10.4.0` / `^8.63.0` | [ESLint Releases](https://github.com/eslint/eslint/releases/tag/v10.4.0)     | Static syntax validation and TypeScript lint guardrails     |
| **Formatter**    | `prettier`                            | `3.8.1`              | [Release 3.8.1](https://github.com/prettier/prettier/releases/tag/3.8.1)     | Deterministic code and documentation formatting             |

## 7. Token Efficiency & Workflow Management

1. **Modular Files:** Extract new functionality into focused modules, services, or components rather than growing monolithic files.
2. **Targeted Tests During Iteration:** Run single spec files during active edits (`npx ng test --include <spec-file> --watch=false`). Reserve full suite runs (`make repchecks`) and Playwright E2E tests for task completion or explicit user requests.
3. **Batch Small Requests:** When the user makes consecutive small UI/CSS requests, suggest batching them into an `implementation_plan.md` or spec.
4. **Consult Architecture First:** Read [`architecture/README.md`](architecture/README.md) and the relevant domain doc (`01` through `08`) before designing features, modifying state, or refactoring.
5. **Offload Large Payloads to Temp Space:** Never print payloads or logs >100 lines to stdout. Write large outputs to `<conversation-id>/scratch/` or `/tmp/`, inspect the schema with `head -n 20` or `jq '.[0]'`, and extract answers using deterministic CLI tools (`jq`, `grep`, `awk`, or Node.js scripts).

## 8. Strict Verification & Systemic Bug Searching

- **UI & Console Verification:** Before marking any UI task complete, verify both rendered DOM behavior and zero console errors on `http://localhost:4200` using the `visual-verification` skill (`chrome-devtools-mcp`).
- **Codebase-Wide Bug Sweep:** When fixing a bug caused by a code pattern (e.g., missing parent country roll-up, unescaped popup HTML, unvisited marker filtering), search the entire codebase with `ast-grep` or `rg` and fix all occurrences before reporting back.
- **Fail Fast & Zero Silent Fallbacks:** Never use empty `catch` blocks or return dummy fallback values (`null`, `[]`, `{}`) in service layers unless required by the spec. Rethrow errors, route them to boundary error handlers, or log via `LoggerService.error()`. Validate external inputs (API responses, LocalStorage payloads, OSRM geometry) at system boundaries.

## 9. Spec-Driven Lifecycle & Living Architecture Maintenance

- **Specs First (`./specs`):** Draft and obtain user approval on `./specs/SPEC-<id>-<title>.md` (following `spec-authoring`) before starting any new feature or refactor.
- **Implementation Plan Mandate:** Reference the active `./specs/SPEC-<id>-<title>.md` at the top of `implementation_plan.md` and wait for explicit user approval before modifying code.
- **Vertical Slices:** Implement specs in sequential checkpoints: (1) Data Models & Contracts, (2) Vitest Unit Tests, (3) Core Services & State, (4) Component UI. Validate each slice with `lsp_diagnostics` or targeted tests before proceeding to the next.
- **Living Architecture Sync:** Update unit/integration tests, [`architecture.md`](architecture.md), [`architecture/README.md`](architecture/README.md), and affected domain docs (`architecture/01-*.md` through `08-*.md`) whenever contracts or behaviors change.

## 10. Structured Prompts & Subagent Delegation

- **Structured Subagent Prompts:** Every subagent delegation prompt must define:
  1. **Role & Persona:** Exact specialist role.
  2. **Grounding Links:** Active `specs/SPEC-<id>-<title>.md` and `architecture/*.md` files.
  3. **Scope Boundaries:** Explicit in-scope and out-of-scope files/domains.
  4. **Execution Steps:** Numbered steps with state contracts, GIS rules, or DOM selectors.
  5. **Deliverables & Verification:** Target files to modify, unit tests to add, and `make repchecks`.
  6. **Constraints:** No magic numbers, official doc links for new APIs, `LoggerService` instead of `console.*`, 0 lint warnings, and 0 console errors.
- **Structured Handoff Report:** Subagent completion responses must contain: `Changes Applied`, `Test/Lint Results`, `Edge Cases Found`, and `Immediate Next Steps`.

## 11. Workspace Skills & Purpose-Built Subagent Personas

- **Workspace Skills (`.agents/skills/`)**:
  - `gis-and-state-audit`: Leaflet GIS layers, parent region/country roll-up, Option A trip stop classification, and Schema V4 migration checks.
  - `spec-authoring`: Canonical `SPEC-NNN` authoring and living architecture sync.
  - `visual-verification`: Live Angular DOM, Leaflet canvas, and console verification via `chrome-devtools-mcp`.
  - `subagent-catalog`: `define_subagent` registration blueprints for specialist personas.
- **Subagent Definitions (`.agents/agents/` & `define_subagent`)**:
  - `gis-state-auditor`: Audits GIS layer services, RxJS state streams, and V4 schema migrations in `src/app/services/` and `src/app/components/map-view/`.
  - `visual-auditor`: Verifies component layout, modal accessibility, Leaflet rendering, and zero console errors via `chrome-devtools-mcp`.
  - `security-sanitizer`: Audits `LocalStorageService` schema validation, `escapeHtml` popup escaping, `NetworkInterceptor` resilience, and `ast-grep` rules.
  - `spec-architect`: Authors `specs/SPEC-NNN-*.md` proposals and updates `architecture/*.md`.
  - `harness-optimizer`: Inspects session transcripts and diffs to extract `Makefile` targets, `ast-grep` rules, and architecture updates.

## 12. Zero-Friction Lazy MCP Signatures & Proactive Coaching Triggers

### 12.1 Direct `call_mcp_tool` Signatures

Call lazy MCP tools directly via `call_mcp_tool` using these argument schemas:

- **LSP Symbol Lookup (`lsp-bridge` -> `lsp_find_symbol`)**:
  - `Arguments`: `{ "name": "<symbolName>", "include": ["hover", "definition", "references"] }`
- **LSP Module Surface (`lsp-bridge` -> `lsp_file_exports`)**:
  - `Arguments`: `{ "file_path": "src/...", "include_signatures": true }`
- **AST Structural Search (`ast-grep` -> `find_code`)**:
  - `Arguments`: `{ "project_folder": "src", "language": "typescript", "pattern": "<AST_Pattern>" }`
- **Browser Console Audit (`chrome-devtools-mcp` -> `list_pages` & `list_console_messages`)**:
  - `list_pages` `Arguments`: `{}`
  - `list_console_messages` `Arguments`: `{ "pageId": 1, "types": ["error", "warn"] }`
- **Multi-Step Architectural Reasoning (`sequential-thinking` -> `sequentialthinking`)**:
  - `Arguments`: `{ "thought": "<step analysis>", "thoughtNumber": 1, "totalThoughts": 4, "nextThoughtNeeded": true }`

### 12.2 Proactive User Coaching & Slash Command Triggers

Recommend these commands when matching conditions occur:

1. **Ambiguous UX/GIS Requirements -> Recommend `/grill-me`**:
   - _Trigger_: High-level feature requests with open UX, trip-routing, or place-categorization edge cases.
   - _Prompt_: _"Tip: Type `/grill-me` to run a quick interactive interview to lock down edge cases before drafting the spec."_
2. **Multi-Subsystem State & GIS Sync -> Call `sequential-thinking`**:
   - _Trigger_: Tasks touching 2+ reactive subsystems (e.g., `TripDeltaService` + `StateService` roll-up + `MapShadingService` + `LocalStorageService`).
   - _Action_: Call `sequentialthinking` before authoring the plan and summarize the state transitions for the user.
3. **Large Multi-Spec Refactors -> Recommend `/goal` or `/boost`**:
   - _Trigger_: Long-running refactors, full-codebase audits, or multi-component overhauls.
   - _Prompt_: _"Tip: For deep multi-perspective verification or autonomous completion across all suites, consider triggering `/boost` or `/goal`."_
4. **Recurring Checks or Reminders -> Recommend `/schedule`**:
   - _Trigger_: Dependency release checks, periodic test runs, or follow-up reminders.
