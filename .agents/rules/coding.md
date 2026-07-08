---
name: General Coding Principles
description: Always-on general coding principles for modern best practices, security, and quality assurance.
globs:
  - "**/*"
---

# General Coding Principles

These principles apply universally across the entire codebase and must be followed at all times.

## 1. Modern Best Practices
- Always seek and apply the most modern best practices for the given framework or language.
- Keep dependencies updated and prefer native platform features over heavy third-party polyfills when widely supported.
- Strive for clean, readable, and self-documenting code. 

## 2. Quality Assurance & Tooling
- Always run linters and code formatters (e.g., ESLint, Prettier) before finalizing code changes.
- Ensure all automated tests (unit, integration, and feature tests) pass locally.
- Write tests alongside new feature development.

## 3. Security
- Proactively run security scanners to identify vulnerabilities, especially when dealing with user input, database interactions, or external APIs.
- Validate and sanitize all external inputs.
- Never hardcode secrets, API keys, or sensitive configuration data. Use environment variables.

## 4. Code Review
- Perform self-review of code before committing.
- Leave clear, descriptive commit messages and PR descriptions outlining what changed and why.
