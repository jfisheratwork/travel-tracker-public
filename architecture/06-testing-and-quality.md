# 06. Testing & Quality Assurance

## 1. Quality Assurance Commands (`Makefile`)

The repository provides standard `make` targets to run all testing, linting, structural analysis, and build routines in a consistent sandbox-safe environment:

| Command             | Underlying Script                       | Purpose & Description                                                                 |
| :------------------ | :-------------------------------------- | :------------------------------------------------------------------------------------ |
| `make test`         | `ng test --watch=false`                 | Runs the full Vitest unit test suite (24 suites, 192 tests).                          |
| `make test-e2e`     | `npx playwright test`                   | Runs the headless Playwright E2E browser test suite.                                  |
| `make lint`         | `eslint src/`                           | Runs ESLint across all TypeScript and HTML source files.                              |
| `make lint-rules`   | `ast-grep scan src/`                    | Scans source code against structural SAST rules in `.agents/ast-grep-rules/`.         |
| `make lint-skills`  | `agnix validate` & `scan-skills-safety` | Validates `.agents/` and `specs/` for frontmatter, prompt injection, & secret leaks.  |
| `make lint-prose`   | `vale --minAlertLevel error ...`        | Checks Markdown documentation against AI prose clichés (`vale-ai-tells`).             |
| `make format`       | `prettier --write ...`                  | Formats TS, JS, HTML, CSS, JSON, YAML, and Markdown files according to `.prettierrc`. |
| `make format-check` | `prettier --check ...`                  | Verifies formatting without modifying files.                                          |
| `make audit`        | `npm audit --audit-level=high`          | Scans npm dependencies for high/critical security vulnerabilities.                    |
| `make pre-commit`   | `bash .husky/pre-commit`                | Executes the 6-stage deterministic staged-file validation gate.                       |
| `make pre-push`     | `bash .husky/pre-push`                  | Executes the full Vitest unit test suite gate prior to `git push`.                    |
| `make build`        | `npm run build`                         | Compiles production distribution bundle into `dist/`.                                 |
| `make clean`        | `rm -rf dist/ .angular/`                | Cleans cached artifacts and build output.                                             |

---

## 2. Deterministic Git Hooks & Agent `PostToolUse` Pipeline

1. **Fast 6-Stage Pre-Commit Gate (`.husky/pre-commit`)**:
   - Auto-unstages any accidentally staged `docs/newsite/` files (built by GitHub Actions).
   - Runs **Stage 1 (Prettier)**, **Stage 2 (Syntax & ESLint)**, **Stage 3 (`ast-grep` SAST)**, **Stage 4 (`agnix` & `scan-skills-safety.js`)**, **Stage 5 (Vale AI-Tells)**, and **Stage 6 (`npm audit`)** strictly on staged files for sub-second feedback.
2. **Pre-Push Verification Gate (`.husky/pre-push`)**:
   - Runs the full Vitest unit test suite (`make test`) before any `git push` completes.
3. **Automated `PostToolUse` Agent Hook (`.agents/hooks.json` & `scripts/post-tool-quality.js`)**:
   - Automatically verifies syntax, ESLint, and `ast-grep` rules on every file modified by `write_to_file` or `replace_file_content`, and emits a UI verification reminder when components, templates, or styles are touched.

---

## 3. Unit Testing Architecture (Vitest)

Unit tests run via Vitest (`v4.1.11`) directly integrated with the Angular CLI builder:

- **Sandbox Safety**: `HOME=$(pwd)/scratch NG_CLI_ANALYTICS=false` is automatically prepended by `Makefile` so tests never attempt to read user home directory files outside the workspace.
- **Leaflet Mocking**: Since Leaflet relies on browser DOM properties (`window`, SVG elements), Leaflet APIs (`L.map`, `L.tileLayer`, `L.marker`, `L.divIcon`, `L.geoJSON`) are mocked via `vi.mock('leaflet')` in component tests.
- **Service Mocks**: Use RxJS `BehaviorSubject` instances to verify synchronous and asynchronous stream emissions.

---

## 4. End-to-End Testing (Playwright)

Headless browser tests are configured in `playwright.config.ts` and reside in `e2e/`:

- Configured with `reporter: [['list'], ['html', { open: 'never' }]]` and resilient Chromium/Chrome fallback resolution (`resolveChromiumLaunchOptions()`) so CLI and automated runs never hang on an interactive HTML report server.
- Per `AGENTS.md` Rule 7, agents should **not** run the full Playwright suite after minor tweaks; rely on targeted Vitest specs and `chrome-devtools-mcp` browser verification.

---

## 5. Coding Standards Enforced by Linter, `ast-grep` & Agent Rules

1. **No Magic Numbers**: All geometric or conversion factors (e.g. `METERS_PER_MILE = 1609.34`, `HOURS_PER_DAY = 24`) must be defined as semantically named constants.
2. **The Documentation Linking Rule**: The first time an Angular decorator, third-party library API, or complex HTML element is used in a file, a comment linking directly to its official documentation must be placed above it.
3. **Structured Logging**: Direct use of `console.log`, `console.warn`, or `console.error` is banned in application code. Use `LoggerService` instead.
4. **Structural SAST Rules (`.agents/ast-grep-rules/`)**: Enforces `no-disabled-tests`, `no-eval-or-innerhtml`, `no-floating-promises`, `no-generic-catch-param`, `no-hardcoded-credentials`, `no-insecure-random`, `no-nan-compare`, `no-prototype-pollution`, `require-sanitization-on-html`, `strict-equality-checks`, and `no-direct-localstorage-write` (requiring `LocalStorageService`).
