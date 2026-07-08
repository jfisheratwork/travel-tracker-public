---
name: Git Pre-Commit Hook Guidelines
description: Requirements and steps for agentic pre-commit checks to ensure code quality, compliance with best practices, dependency updates, and automated test suite verification.
globs: "*"
---

# Agentic Pre-Commit Hook Guidelines

Any agentic pre-commit workflows or scripts must implement checks to ensure code quality, compliance, and regression safety.

## Required Pre-Commit Checklist

### 1. Modern Best Practices
- Scan for modern HTML, CSS, and JS practices.
- Ensure styling uses clean CSS variables, grid, and flex layouts, avoiding outdated styling structures.
- Enforce the rules in `javascript-conventions.md`.

### 2. Dependency Version Check
- Scan CDN links (in `index.html`) and package dependencies for minor or patch version updates.
- If a new minor or patch version of Leaflet or SheetJS is available, flag it or propose an upgrade to the developer.

### 3. Automated Test Verification
- Always execute the full test suite before staging or committing changes:
  ```bash
  node --test tests/*.test.js
  ```
- Block commits if any test suite fails.

### 4. Security & Secure Coding Skills
- Verify security rule integrations (such as Firebase Security Rules if relevant, or client-side sanitization).
- Ensure all inputs rendered to the page are passed through safe escaping (like `escapeHTML`) to prevent XSS.
