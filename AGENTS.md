# AI Agent Rules & Governance

This document outlines the global rules for contributing to the Travel Tracker project, specifically for AI assistance.

## 1. Strict Approval & External Command Security

- **Explicit Plan Permission Required:** Agents MUST pause execution and wait for the user's manual explicit approval before beginning implementation after presenting an `implementation_plan.md`. Do not proceed based on implicit permission.
- **External Command Approval Required:** Never execute a NON-READONLY command that interacts with external services (e.g., GitHub, Hosting Platforms) without explicit user review and approval.
- **Scope:** This includes `git push`, creating pull requests, deploying to external servers, or any API write operations.
- **Process:** Always propose the exact command first, explain its impact, and wait for user confirmation.

## 2. Attribution & Documentation Hygiene

- **Commit Messages & Pull Requests:** All commit messages and PR descriptions created with AI assistance must include the following footer:
  > Written with the assistance of Google Gemini
- **UserWalkthrough.md:** Periodically update `UserWalkthrough.md` in the root workspace (ignored by git) with recent screenshots to verify features visually.
- **local_only/ Hygiene:** Personal profile backups, legacy specs (`local_only/openspec/`, `local_only/future_ideas/`), and scratch notes (`local_only/todo.md`) reside strictly in `local_only/`. Keep `local_only/todo.md` focused on remaining work; remove completed items once reflected in the living architecture.

## 3. Session Management

- **Session Directories:** At the start of every new coding session, a session directory tracking the session details must be created in the `my_sessions/` directory (which is `.gitignore`d to prevent local/personal session summaries and logs from being committed to GitHub).
- **Naming Convention:** `my_sessions/YYYY-MM-DD-Session-{n}/` where `{n}` is an incrementing integer starting at 1 for the first session of that day (e.g. `my_sessions/2026-05-23-Session-1/`, `my_sessions/2026-05-23-Session-2/`).
- **New Session Trigger:** A new session folder MUST be created when starting work on a new feature branch, or when wrapping up previous work after a merged PR (ensuring that subsequent tasks are isolated and their history/plans are not overwritten).
- **Session Directory Contents & Update Frequency:**
  Each session directory MUST contain a `session_summary.md` markdown file, which should only be updated when committing or pushing to optimize token usage:
  1. `session_summary.md`: The main summary of the session. It must follow this structured layout:
     - **Executive Summary:** A concise overview of the session, goals, and results at the top.
     - **Outcomes:** The specific results, updates, and milestones achieved.
     - **Fine-grained Details:** In-depth technical breakdown of tasks completed (`Tasks Done`) and tasks remaining or postponed (`Tasks Not Done`).
     - **Prompt Log:** A list of high-level prompt summaries detailing each interaction/request during the session at the very bottom.

## 4. File System Boundaries & Tooling Hooks

- **Workspace Confinement:** Never modify files outside of the project's root workspace.
- **Git Directory:** Do not modify files inside the `.git` directory unless running a specific git command approved by the user.
- **System Files:** Do not touch system configuration files or user home directory files outside the repo.
- **Automated PostToolUse Hook (`scripts/post-tool-quality.js`):** Every file edit via `write_to_file` or `replace_file_content` automatically runs syntax/ESLint checks and `ast-grep scan` via `.agents/hooks.json`. When the hook reports clean status, agents do not need to duplicate manual single-file `npx eslint` calls.
- **Task Completion & Makefile Workflow:** Always run `make lint` and `make lint-rules` once a logical feature or multi-file change is complete, or immediately if the PostToolUse hook surfaces any diagnostic warnings.

## 5. Tri-Tier Code Navigation: LSP, AST Analysis (`ast-grep`), and Fast Search

### Fast Navigation Playbook (Benchmarked Protocols)

Follow this high-speed, token-efficient navigation sequence:

1. **Tier 1 — LSP Bridge (`lsp-bridge` MCP) for Module & Symbol Semantics**:
   - Call `lsp_find_symbol(name: "...")`, `lsp_goto_definition`, `lsp_find_references`, `lsp_file_exports`, and `lsp_file_imports` to resolve TypeScript/Angular symbols in <0.2s without grepping or loading full files.
   - _CRITICAL Decorator Trap Warning_: NEVER call `lsp_find_references` on framework decorator lines (e.g., `@Injectable`, `@Component`, `@Output`). This forces the language server to scan thousands of framework files in `node_modules` and causes multi-minute hangs. Always target the actual class/method identifier.
2. **Tier 2 — Semantic AST Search (`ast-grep`) for Structural Patterns & File Outlines**:
   - Run `ast-grep outline --view expanded <path>` on unfamiliar files to emit a 40-line structural digest with exact line numbers (~95% token savings vs reading the full file).
   - Use `ast-grep` (`find_code` MCP, `sg run -p '<pattern>'`, or `make lint-rules`) for locating method signatures, class members, or structural code patterns.
3. **Tier 3 — Fast Regex Pairing (`ripgrep` / `rg`) for Unstructured Text**:
   - Reserve `rg` for quick literal string searches, CSS selectors, HTML element IDs, and Markdown documentation; escalate to `ast-grep` or `lsp-bridge` when AST context or call hierarchy matters.
4. **Instant Type Verification**:
   - Call `lsp_diagnostics(file_path)` for 0.2s in-memory compilation checks before running `make lint`.

### Deterministic Refactoring & Compiler-First Feedback

- **Tooling-Driven Refactoring**: Prefer AST/LSP refactoring operations (`lsp_rename`, `ast-grep --rewrite`, `npx eslint --fix`, or Prettier) over blind find-and-replace to prevent collateral substitutions.
- **Step-by-Step Refactor Validation**:
  1. Locate target AST nodes and map all callsites using `lsp_find_references` or `sg run -p '<symbol>($$$)'`.
  2. Apply changes modularly.
  3. Validate with `lsp_diagnostics`, `make lint`, and `make lint-rules` before declaring the refactor complete.

## 6. External Libraries & Dependency Inventory

When including external libraries (e.g., via CDN or `package.json`), agents MUST adhere to the following rules:

1. **Explicit Versioning**: Always use an explicit, fixed version number. Do not use `@latest` or unversioned links.
2. **Release Notes Comment**: Every external library inclusion must be accompanied by a code-level comment containing the URL to the release notes or official documentation for that specific version.
3. **Session Start Updates**: At the start of a new session, check if updated versions of included libraries are available. A library version may only be updated if it has been publicly released for **at least 5 days** (to avoid absorbing zero-day bugs or immediate post-release regressions).

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

To optimize AI context window size and maintain high performance, agents MUST follow these workflow rules:

1. **Modular File Structure**: Prefer smaller, focused files over monolithic files. When adding significant new functionality, break it out into a new module, service, or component file rather than appending thousands of lines to a single file.
2. **Targeted Test Execution**: Do NOT run the full test suite (especially headless browser tests) after every minor tweak. Only run full integration tests when a major logic feature is complete, at the very end of a workflow, or when explicitly requested by the user. Rely on targeted Vitest specs (`npx vitest run <spec-file>`) for small changes.
3. **Encourage Batched Requests**: If the user begins making many small, rapid-fire iterative requests (e.g., minor CSS tweaks one by one), politely encourage the user to batch their requests into a larger body of work using an `implementation_plan.md` or spec file.
4. **Mandatory Architecture Reference**: Before designing new features, introducing state, or refactoring components, agents MUST consult [`architecture/README.md`](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture/README.md) and the relevant domain document (e.g., `02-state-and-data-flow.md` for state changes, `03-map-and-gis-architecture.md` for mapping, `08-v4-places-and-trips-design.md` for V4 places/trips). Agents must never guess architectural boundaries or read monolithic files blindly.

## 8. Strict Verification & Systemic Bug Searching

- **Mandatory Validation Loop:** You CANNOT declare a UI task "done" without explicitly validating both the UI logic and the Developer Console. Use the `visual-verification` skill (`chrome-devtools-mcp` on `http://localhost:4200`) or targeted tests to verify there are zero console errors and that the UI renders as intended.
- **Systemic Pattern Matching:** If you discover a bug caused by a specific code pattern (e.g., missing parent country roll-up, unescaped popup strings, unvisited marker filtering), you MUST proactively search the ENTIRE codebase for identical patterns using `ast-grep` or `rg`, and fix them globally before reporting back. Never assume a bug is isolated to a single file.

## 9. Spec-Driven Lifecycle & Living Architecture Maintenance

- **Specs First (`./specs`):** Any time a new body of work, feature, or refactor is initiated, it must first be drafted and approved as a proposal document under `./specs/SPEC-<id>-<title>.md` (following the `spec-authoring` skill).
- **Implementation Plan Mandate:** Every `implementation_plan.md` MUST explicitly begin with a review and direct reference to the active approved Spec under `./specs/` (when applicable), and receive explicit user approval before touching code.
- **Work Decomposition:** The approved Spec must clearly decompose into specific verifiable tasks, state/GIS contracts, and UI checks.
- **Living Architecture Updates (`architecture.md` & `./architecture/*.md`):** As work is completed, tested, and visually verified, changes are NOT saved only as disconnected changelogs. Instead, the final design, state schemas, and component contracts MUST be reflected directly in:
  1. Targeted automated unit and integration tests.
  2. Updates to the master system portal [`architecture.md`](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture.md) and index [`architecture/README.md`](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture/README.md).
  3. Updates to the corresponding domain subfiles under [`architecture/`](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture/) (`01-system-overview.md` through `08-v4-places-and-trips-design.md`).

## 10. Structured Prompts & Subagent Delegation

- **Structured Prompts Over Free-Form Prose**: When delegating work to subagents, launching multi-agent workflows, or authoring task instructions, prompts MUST be structured rather than loose conversational text.
- **Mandatory Prompt Anatomy**:
  1. **Role & Specialist Persona**: Explicitly declare the agent's exact role (e.g., `GIS & Reactive State Auditor`, `Angular UI Component Engineer`, `Security Sanitizer`).
  2. **Context & Grounding References**: Link specific active specifications (`specs/SPEC-<id>-<title>.md`) and architecture blueprints (`architecture/*.md`).
  3. **Explicit Scope & Boundaries**: Clearly state what is in scope and what is strictly out of scope to prevent domain drift and file collisions.
  4. **Task Decomposition**: Break execution down into discrete, numbered steps with precise state contracts, GIS coordinate rules, or DOM selectors.
  5. **Verifiable Deliverables & Acceptance Criteria**: List exact files to create/modify, test suites to add/update, and execution commands (`make lint`, `make lint-rules`, `make test`).
  6. **Strict Governance & Constraints**: Enforce project non-negotiables: no magic numbers, documentation linking for external APIs, `LoggerService` instead of `console.*`, 0 lint warnings, and zero console errors.
- **Structured Handoff Reporting**: When subagents or autonomous agents complete a workflow, the handoff summary must be structured: Changes Applied, Test/Lint Results, Edge Cases Found, and Immediate Next Steps.

## 11. Workspace Skills & Purpose-Built Subagent Personas

- **Progressive Workspace Skills (`.agents/skills/`)**:
  - `gis-and-state-audit`: Leaflet GIS layers, parent region/country roll-up, Option A trip stop classification, and Schema V4 migration verification.
  - `spec-authoring`: Canonical `SPEC-NNN` authoring and living architecture synchronization.
  - `visual-verification`: Live Angular DOM, Leaflet map canvas, and developer console inspection via `chrome-devtools-mcp`.
  - `subagent-catalog`: Ready-to-use `define_subagent` registration blueprints for all specialist personas.
- **Reusable Subagent Definitions (`.agents/agents/` & `define_subagent`)**:
  - `gis-state-auditor`: Audits GIS layer services, RxJS state streams, and V4 schema migrations across `src/app/services/` and `src/app/components/map-view/`.
  - `visual-auditor`: Verifies Angular component layout, modal accessibility, Leaflet map rendering, and zero console errors via `chrome-devtools-mcp`.
  - `security-sanitizer`: Audits `LocalStorageService` schema protection, XSS escaping (`escapeHtml`), `NetworkInterceptor` resilience, and `ast-grep` security rules.
  - `spec-architect`: Drafts new `specs/SPEC-NNN-*.md` proposals and updates `architecture/*.md` blueprints.

## 12. Zero-Friction Lazy MCP Signatures & Proactive Coaching Triggers

### 12.1 Direct `call_mcp_tool` Signatures (No Schema Lookup Required)

To eliminate schema-lookup overhead, call these lazy MCP tools directly via `call_mcp_tool`:

- **LSP Symbol Lookup (`lsp-bridge` -> `lsp_find_symbol`)**:
  - `Arguments`: `{ "name": "<symbolName>", "include": ["hover", "definition", "references"] }`
- **LSP Module Surface (`lsp-bridge` -> `lsp_file_exports`)**:
  - `Arguments`: `{ "file_path": "/Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/...", "include_signatures": true }`
- **AST Structural Search (`ast-grep` -> `find_code`)**:
  - `Arguments`: `{ "project_folder": "/Users/jacobfisher/coding/traveltracker/travel-tracker-public/src", "language": "typescript", "pattern": "<AST_Pattern>" }`
- **Browser Console Audit (`chrome-devtools-mcp` -> `list_pages` & `list_console_messages`)**:
  - `list_pages` `Arguments`: `{}`
  - `list_console_messages` `Arguments`: `{ "pageId": 1, "types": ["error", "warn"] }`
- **Multi-Step Architectural Reasoning (`sequential-thinking` -> `sequentialthinking`)**:
  - `Arguments`: `{ "thought": "<step analysis>", "thoughtNumber": 1, "totalThoughts": 4, "nextThoughtNeeded": true }`

### 12.2 Proactive User Coaching & Slash Command Recommendations

Agents MUST proactively suggest the following workflows and tools to the user when matching conditions arise:

1. **Ambiguous Requirements or Multi-Option UX/GIS Tradeoffs -> Recommend `/grill-me`**:
   - _Trigger_: When the user proposes a high-level feature with open UX, trip-routing, or place-categorization edge cases.
   - _Prompt to User_: _"Tip: You can type `/grill-me` to run a rapid interactive interview to lock down edge cases before we draft the spec."_
2. **Complex Multi-Layer State & GIS Sync -> Invoke `sequential-thinking` & Inform User**:
   - _Trigger_: Tasks combining 2+ reactive subsystems (e.g., `TripDeltaService` + `StateService` parent roll-up + `MapShadingService` GeoJSON layers + `LocalStorageService` migrations).
   - _Action_: Automatically call `sequential-thinking` (`sequentialthinking`) before authoring the plan and highlight the state transitions to the user.
3. **Large Multi-Spec Refactors or Deep Audits -> Recommend `/goal` or `/boost`**:
   - _Trigger_: Long-running refactors, full-codebase audits, or multi-component overhauls.
   - _Prompt to User_: _"Tip: For deep multi-perspective verification or autonomous completion across all suites, consider triggering `/boost` or `/goal`."_
4. **Recurring Health Checks or Timed Reminders -> Recommend `/schedule`**:
   - _Trigger_: Dependency release checks, periodic test runs, or follow-up reminders.

---

_These rules are to be followed by all contributors and AI assistants._
