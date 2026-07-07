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
- **Session Directories:** At the start of every new coding session, a session directory tracking the session details must be created in the `sessions/` directory.
- **Naming Convention:** `sessions/YYYY-MM-DD-Session-{n}/` where `{n}` is an incrementing integer starting at 1 for the first session of that day (e.g. `sessions/2026-05-23-Session-1/`, `sessions/2026-05-23-Session-2/`).
- **New Session Trigger:** A new session folder MUST be created when starting work on a new feature branch, or when wrapping up previous work after a merged PR (ensuring that subsequent tasks are isolated and their history/plans are not overwritten).
- **Session Directory Contents & Update Frequency:**
  Each session directory MUST contain the a session_summary markdown file, which should only be updated when committing or pushing to optimize token usage:
  1. `session_summary.md`: The main summary of the session. It must follow this structured layout:
     - **Executive Summary:** A concise overview of the session, goals, and results at the top.
     - **Outcomes:** The specific results, updates, and milestones achieved.
     - **Fine-grained Details:** In-depth technical breakdown of tasks completed (`Tasks Done`) and tasks remaining or postponed (`Tasks Not Done`).
     - **Prompt Log:** A list of high-level prompt summaries detailing each interaction/request during the session at the very bottom.

## 4. File System Boundaries
- **Workspace Confinement:** Never modify files outside of the project's root workspace.
- **Git Directory:** Do not modify files inside the `.git` directory unless running a specific git command approved by the user.
- **System Files:** Do not touch system configuration files or user home directory files outside the repo.


## 5. Agent Directives: LSP-First Engineering

### Navigation & Discovery
- ALWAYS prioritize LSP operations (goToDefinition, findReferences, workspaceSymbol) for code discovery.
- NEVER use grep, glob, or read_file for navigation tasks unless LSP tools explicitly fail.
- When refactoring, perform a symbol search (LSP) to identify all call sites before attempting any file modifications.

### Token Optimization
- Do not read full file contents to "infer" dependencies. Use LSP to inspect call hierarchies.
- Perform refactors atomically: 1. Rename/Modify definition; 2. Update specific call sites identified by LSP; 3. Run type-check.
- Avoid "mega-prompts" that ask for structural changes across 5+ files simultaneously. Break into modular sub-tasks.

### Antigravity/Gemini Context
- Leverage the IDE's internal symbol table. If you are unsure of a symbol's usage, call `workspaceSymbol` instead of scanning the file tree.

---
*These rules are to be followed by all contributors and AI assistants.*
