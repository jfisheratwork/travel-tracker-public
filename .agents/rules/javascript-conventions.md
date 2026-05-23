---
name: JavaScript Conventions
description: Coding and naming conventions for the project, including rules for semantic naming, avoiding core type name conflicts, event parameters, exceptions, and abbreviations.
globs: "docs/js/**/*.js"
---

# JavaScript Naming & Coding Conventions

These conventions must be strictly followed when writing or refactoring JavaScript code in this project.

## 1. Naming Conventions

### No Single-Character Variable Names
- Except for standard mathematical or loop coordinates when strictly local (e.g., `x`, `y` for 2D plane calculations), do not use single-character variable names like `i`, `j`, `m`, `p`, `r`, `s`.
- Use descriptive names: `lineIndex` instead of `i`, `familyMember` instead of `m`, `mapMarker` instead of `m`, `savedRoute` instead of `r`.

### Avoid Core Type & Reserved Name Conflicts
- Do **not** use names of core constructs, language built-ins, or base data types as parameter or variable names.
- Examples of forbidden names: `string`, `val`, `value`, `object`, `array`, `number`.
- Use specific names: `valueStr`, `passedVal`, `parsedObject`, `locationItem`.

### Event Parameter Naming
- Do **not** use generic single-character `e`, `ev`, or generic `event` for event handlers.
- Use `passedEvent` or `eventParam` instead.

### Exception Catch Naming
- Do **not** use generic `e` or `error` in catch blocks.
- The exception variable name must reflect the origin and operation being performed:
  - `loadSettingsError`
  - `parseDataError`
  - `saveVisitError`
  - `importBackupError`

### Allowed Abbreviations
- Short semantic abbreviations are allowed when their context is clear:
  - `selRoute` (selectedRoute)
  - `regFilter` (regionFilter)
  - `routeIdx` (routeIndex)
  - `hometownIdx` (hometownIndex)

## 2. Code Commenting

- Provide a header comment for every major file and module explaining its role.
- Provide a docstring/comment above every function detailing its purpose.
- When introducing a third-party library (e.g., Leaflet, SheetJS) for the first time in a file, include:
  1. A comment with a link to the library's official page/source code.
  2. A comment explaining exactly what it is used for.

## 3. Style Preferences & Code Complexity

### Prefer Explicit Functions Over Inline Callbacks
- Avoid inline arrow functions or anonymous callbacks for iterators, event listeners, or complex operations when they can be written as explicit, named functions instead.
- For example, instead of:
  ```javascript
  states.forEach(stateKey => { ... });
  ```
  Prefer:
  ```javascript
  states.forEach(renderStateMarkers);
  ```

### Function Length and Cognitive Complexity
- Functions should not exceed approximately 100 lines in most cases. If a function is longer, refactor it into smaller, descriptive helper functions.
- Limit nesting: Nested control statements (such as `if`, `for`, `while`, `switch`) should never go more than 2 levels deep. Use guard clauses (early returns) and separate helper functions to flatten nested blocks.
