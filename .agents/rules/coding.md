---
trigger: always_on
description: Always-on general coding principles for modern best practices, security, and quality assurance.
---

# General Coding Principles

These principles apply universally across the entire codebase and must be followed at all times.

## 1. Modern Best Practices
- Always seek and apply the most modern best practices for the given framework or language.
- Keep dependencies updated and prefer native platform features over heavy third-party polyfills when widely supported.
- Strive for clean, readable, and self-documenting code.
- **No Magic Numbers:** Never use magic numbers directly in code or templates (e.g., raw conversion factors like `1609.34`). Extract them into semantically named variables or constants. 

## 2. Quality Assurance & Tooling
- Always run linters and code formatters (e.g., ESLint, Prettier) before finalizing code changes.
 - Agent Workflow: After modifying any source code, you MUST execute make lint and fix all warnings before presenting the work to the user.
- Ensure all automated tests (unit, integration, and feature tests) pass locally.
- Write tests alongside new feature development.

## 3. Security
- Proactively run security scanners to identify vulnerabilities, especially when dealing with user input, database interactions, or external APIs.
- Validate and sanitize all external inputs.
- Never hardcode secrets, API keys, or sensitive configuration data. Use environment variables.

## 4. Code Review
- Perform self-review of code before committing.
- Leave clear, descriptive commit messages and PR descriptions outlining what changed and why.

## 5. Networking & HTTP Calls
- **ALWAYS implement error handling, connection/read timeouts, and debounced retries** for any HTTP or network call.
- Provide a global interceptor or error handler to prevent silent failures and ensure resilient connections.

## 6. The Documentation Linking Rule
- **CRITICAL:** The first time a specific Angular API, third-party library function, or new HTML element is used in a file, you **MUST** place a comment linking directly to its official documentation above it. 
- Furthermore, organize and comment imports to explain their semantic purpose in complex files (e.g., `app.config.ts`).
- Avoid using `console.log`, `console.warn`, or `console.error`. Use the `LoggerService` abstraction instead.