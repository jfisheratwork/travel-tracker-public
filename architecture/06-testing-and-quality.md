# 06. Testing & Quality Assurance

## 1. Quality Assurance Commands (`Makefile`)

The repository provides standard `make` targets to run all testing, linting, and build routines in a consistent sandbox-safe environment:

| Command | Underlying Script | Purpose & Description |
| :--- | :--- | :--- |
| `make test` | `ng test --watch=false` | Runs the full Vitest unit test suite (14 suites, 38 tests). |
| `make lint` | `eslint src/` | Runs ESLint across all TypeScript source files. |
| `make format` | `prettier --write ...` | Formats all TS, HTML, and CSS files according to `.prettierrc`. |
| `make build` | `npm run build` | Compiles production distribution bundle into `dist/`. |
| `make clean` | `rm -rf dist/ .angular/` | Cleans cached artifacts and build output. |

---

## 2. Unit Testing Architecture (Vitest)

Unit tests run via Vitest (`v4.1.11`) directly integrated with the Angular CLI builder:
- **Sandbox Safety**: `HOME=$(pwd)/scratch NG_CLI_ANALYTICS=false` is automatically prepended by `Makefile` so tests never attempt to read user home directory files outside the workspace.
- **Leaflet Mocking**: Since Leaflet relies on browser DOM properties (`window`, SVG elements), Leaflet APIs (`L.map`, `L.tileLayer`, `L.marker`, `L.divIcon`, `L.geoJSON`) are mocked via `vi.mock('leaflet')` in component tests.
- **Service Mocks**: Use RxJS `BehaviorSubject` instances to verify synchronous and asynchronous stream emissions.

---

## 3. End-to-End Testing (Playwright)

Headless browser tests are configured in `playwright.config.ts` and reside in `e2e/`:
- Tests cover full user flows: adding family members, searching parks, switching map modes, and rendering route lines.
- Per `AGENTS.md` Rule 7, agents should **not** run the full Playwright suite after minor tweaks; rely on `make test` and manual browser verification.

---

## 4. Coding Standards Enforced by Linter & Agent Rules

1. **No Magic Numbers**: All geometric or conversion factors (e.g. `METERS_PER_MILE = 1609.34`, `HOURS_PER_DAY = 24`) must be defined as semantically named constants.
2. **The Documentation Linking Rule**: The first time an Angular decorator, third-party library API, or complex HTML element is used in a file, a comment linking directly to its official documentation must be placed above it.
3. **Structured Logging**: Direct use of `console.log`, `console.warn`, or `console.error` is banned. Use `LoggerService` instead.
