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
- **Session Summaries:** At the start of every new coding session, a new markdown file must be created in the `sessions/` directory.
- **Naming Convention:** `sessions/YYYY-MM-DD-Session-Summary.md` (append a timestamp or unique ID if multiple sessions occur on the same day).
- **Content:** The summary should track:
  - Date and Time.
  - Objectives.
  - Key changes made.
  - Decisions and rationale.

## 4. File System Boundaries
- **Workspace Confinement:** Never modify files outside of the project's root workspace.
- **Git Directory:** Do not modify files inside the `.git` directory unless running a specific git command approved by the user.
- **System Files:** Do not touch system configuration files or user home directory files outside the repo.

---
*These rules are to be followed by all contributors and AI assistants.*
