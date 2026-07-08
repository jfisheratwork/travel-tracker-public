---
name: TypeScript Conventions
description: Coding and typing conventions for TypeScript files.
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "tsconfig*.json"
---

# TypeScript Conventions

These conventions must be strictly followed when writing or refactoring TypeScript code in this project.

## 1. Type Safety
- **Avoid `any`**: Do not use the `any` type unless strictly necessary (e.g., interacting with untyped third-party legacy code). Use `unknown` and narrow the type instead.
- **Strict Mode**: Ensure code complies with `strict: true` configurations in `tsconfig.json`.

## 2. Interfaces vs Types
- Use `interface` for declaring the shapes of objects, particularly when they need to be extended or implemented by classes.
- Use `type` aliases for unions, primitives, and intersection types.

## 3. Decorators
- Use modern ES decorators (if enabled) or Angular decorators correctly, without polluting class logic.
- Avoid overusing decorators for simple getters or setters.

## 4. Nullish Coalescing & Optional Chaining
- Prefer `?.` (optional chaining) and `??` (nullish coalescing) over verbose logic checks.
