# AI Agent Rules & Governance

This document outlines the global rules for contributing to the Travel Tracker project, specifically for AI assistance.

## 1. External Command Security
- **Strict Approval Required:** Never execute a NON-READONLY command that interacts with external services (e.g., GitHub, Hosting Platforms) without explicit user review and approval.
- **Scope:** This includes `git push`, creating pull requests, deploying to external servers, or any API write operations.
- **Process:** Always propose the exact command first, explain its impact, and wait for user confirmation.

## 2. Attribution
- **Commit Messages & Pull Requests:** All commit messages and PR descriptions created with AI assistance must include the following footer:
  > Written with the assistance of Google Gemini

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

## 4. File System Boundaries
- **Workspace Confinement:** Never modify files outside of the project's root workspace.
- **Git Directory:** Do not modify files inside the `.git` directory unless running a specific git command approved by the user.
- **System Files:** Do not touch system configuration files or user home directory files outside the repo.


## 5. Agent Directives: Semantic Search, LSP & Refactoring

### Fast Navigation Playbook (Benchmarked Protocols)
Follow this high-speed, token-efficient navigation sequence:
1. **Locate Any Symbol**: Call `lsp_find_symbol(name: "...")`. Returns definition location, hover signature, and all references in <0.2s without grepping.
2. **Inspect Unfamiliar Files**: Run `ast-grep outline --view expanded <path>`. Emits a 40-line structural digest with exact line numbers for every method and property (~95% token savings vs reading the full file).
3. **Trace Impact**: Once exact coordinates are obtained from the outline, call `lsp_call_hierarchy` or `lsp_find_references`.
   - *CRITICAL Decorator Trap Warning*: NEVER call `lsp_find_references` on decorator lines (e.g., `@Injectable`, `@Component`). This forces the language server to scan thousands of framework files in `node_modules` and causes multi-minute hangs. Always target the actual class/method identifier.
4. **Inspect Dependencies**: Call `lsp_file_imports` to inspect imports without loading the file.
5. **Instant Type Verification**: Call `lsp_diagnostics(file_path)` for 0.2s in-memory compilation checks before running `make lint`.

### Refactoring Standards
- When renaming or extracting functions, prefer AST/LSP refactoring operations (`rename_symbol`, `ast-grep --rewrite`) over blind find-and-replace to prevent collateral substitutions in comments, strings, or similarly named local variables.
- Batch structural updates atomically:
  1. Locate target AST nodes using pattern matches.
  2. Perform replacement.
  3. Run type-checker diagnostics (`lsp_diagnostics` and `make lint`) immediately after edits.
- Never declare a refactor complete if compiler or diagnostic errors are introduced.

### Token Optimization
- Do not read full file contents to "infer" dependencies. Use LSP to inspect call hierarchies and file imports.
- Perform refactors atomically: 1. Rename/Modify definition; 2. Update specific call sites identified by LSP; 3. Run type-check.
- Avoid "mega-prompts" that ask for structural changes across 5+ files simultaneously. Break into modular sub-tasks.


## 6. External Libraries
When including external libraries (e.g., via CDN), agents MUST adhere to the following rules:
1. **Explicit Versioning**: Always use an explicit, fixed version number. Do not use `@latest` or unversioned links.
2. **Release Notes Comment**: Every external library inclusion must be accompanied by a code-level comment containing the URL to the release notes or changelog for that specific version.
3. **Session Start Updates**: At the start of a new session, agents should check if updated versions of included libraries are available. A library version may only be updated if it has been publicly released for **at least 5 days** (to avoid absorbing zero-day bugs or immediate post-release regressions).

## 7. Token Efficiency & Workflow Management
To optimize AI context window size and maintain high performance, agents MUST follow these workflow rules:

1. **Modular File Structure**: Prefer smaller, focused files over monolithic files. When adding significant new functionality, break it out into a new module or component file rather than appending thousands of lines to `index.html` or a single JavaScript file.
2. **Targeted Test Execution**: Do NOT run the full test suite (especially headless browser tests or Puppeteer) after every minor tweak. Only run integration tests when a major logic feature is complete, at the very end of a workflow, or when explicitly requested by the user. Rely on manual verification or targeted unit tests for small changes.
3. **Encourage Batched Requests**: If the user begins making many small, rapid-fire iterative requests (e.g., minor CSS tweaks one by one), the agent MUST politely encourage the user to batch their requests into a larger body of work. The agent should suggest creating or updating a formal `implementation_plan.md` or spec file so that multiple changes can be processed in a single, token-efficient pass.
4. **Mandatory Architecture Reference**: Before designing new features, introducing state, or refactoring components, agents MUST consult [`architecture/README.md`](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture/README.md) and the relevant domain document (e.g., `02-state-and-data-flow.md` for state changes, `03-map-and-gis-architecture.md` for mapping). Agents must never guess architectural boundaries or read monolithic files blindly.

---
*These rules are to be followed by all contributors and AI assistants.*
