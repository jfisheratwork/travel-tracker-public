---
name: Git Pre-Commit Hook Guidelines
description: Requirements and steps for agentic pre-commit checks to ensure code quality, compliance with best practices, dependency updates, and automated test suite verification.
globs: '*'
---

# Agentic Pre-Commit Hook Guidelines

Any agentic pre-commit workflows or scripts must implement checks to ensure code quality, compliance, and regression safety.

## Required Pre-Commit Checklist

### 1. Modern Best Practices

- Scan for modern Angular, TypeScript, HTML, and CSS practices.
- Ensure styling uses clean CSS variables, grid, and flex layouts, avoiding outdated styling structures.
- Enforce the rules in `javascript-conventions.md` and `typescript-js.md`.

### 2. Dependency Version Check

- Scan `package.json` dependencies for minor or patch version updates.
- If a new minor or patch version of Angular, Leaflet, or RxJS is available (released for at least 5 days), flag it or propose an upgrade to the developer.

### 3. Automated Pre-Commit & Pre-Push Verification

- Always execute the fast staged-file pre-commit validation gates before committing changes, and run unit tests before pushing:
  ```bash
  make pre-commit
  make test
  ```
- Block commits if Prettier, ESLint, `ast-grep` rules (`make lint-rules`), or skill safety checks (`make lint-skills`) fail.

### 4. Security & Storage Sanitization

- Verify that all `localStorage` writes flow through `LocalStorageService` (`src/app/services/local-storage.service.ts`).
- Ensure all user-supplied strings rendered into Leaflet popups (`map-popup.util.ts`) are passed through safe escaping (`escapeHtml`) to prevent XSS.
