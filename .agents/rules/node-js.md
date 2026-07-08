---
name: Node.js Guidelines
description: Coding and architecture conventions for Node.js scripts and backend services.
globs:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
  - "package.json"
---

# Node.js Guidelines

These conventions must be strictly followed when writing or refactoring Node.js code.

## 1. Asynchronous Code
- Prefer `async`/`await` over raw Promises or callbacks.
- Avoid using synchronous filesystem or crypto operations (e.g., `fs.readFileSync`) in the main event loop, except during initial startup scripts.

## 2. Modules
- Always use ES Modules (`import`/`export`) when possible.
- Avoid mixing `require` and `import` in the same module.

## 3. Error Handling
- Use structured error handling (`try`/`catch`) for all async blocks.
- Unhandled promise rejections must be appropriately logged and processed.
