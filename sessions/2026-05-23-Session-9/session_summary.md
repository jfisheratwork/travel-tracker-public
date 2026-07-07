# Session Summary: 2026-05-23-Session-9

## Executive Summary
A session dedicated to preparing a refactor to move the project to Angular and TypeScript. A mandatory constraint of this refactor is that no files under the `docs` directory may be touched.

## Outcomes
- Created new session directory.
- Initialized local branch `feature/moving-to-angular-and-typescript`.
- Drafted a highly detailed implementation plan with OpenSpec deliverables.

## Fine-grained Details
### Tasks Done
- Created session directory.
- Switched to git branch `feature/moving-to-angular-and-typescript`.
- Deep dive into legacy `app.js` and `ui.js` to map out 10 distinct Angular component deliverables.

### Tasks Not Done
- Implement Angular and TypeScript code outside of `docs/`.
- Scaffold the `openspec/` markdown files.

## Prompt Log
1. **User Prompt:** "new branch big changes coming MANDATORY this refactor is not allowed to touch ANY of files UNDER docs"
2. **User Prompt:** "branch name moving to angular and typescript"
3. **User Prompt:** Feedback to expand Phase 5 into specific OpenSpec claims and define a strict Loop/Stop/Verify execution workflow.
4. **User Prompt:** Save the drafted implementation plan to the session summary.

---

## Draft Implementation Plan (Saved Backup)

# Migration to Angular & TypeScript

This plan details the exhaustive migration of the Travel Tracker from plain JavaScript to a modern Angular and TypeScript stack. The strategy ensures zero modifications to the existing `docs/` folder, introduces robust build, testing, and formatting processes, and outlines a meticulously componentized application architecture driven by OpenSpec style claims.

## Constraints & Rules
- **DO NOT TOUCH `docs/`**: No files under the `docs/` directory will be modified, created, or deleted during this migration.
- **Root Scaffolding**: All Angular configurations, package dependencies, and new source files will reside at the project root (or inside a new `src/` directory).

## Proposed Changes

### Prerequisites
Before running the Angular CLI, ensure the environment is correctly set up.
1. Run `brew install node` to get the latest Node.js and npm.
2. Run `npm install -g @angular/cli` to globally install the Angular CLI.

### Phase 1: Foundation and Scaffolding
We will establish the new build environment at the project root.

#### [NEW] `package.json`
- Initialize npm via Angular CLI.
- Add `typescript-language-server` as a `devDependency` to leverage language and VS Code provided tools for refactoring and lookup.
- Add `prettier`, `eslint-config-prettier`, and `eslint-plugin-prettier` to enforce formatting.
- Configure scripts (`start`, `build`, `lint`, `format`, `test`).

#### [NEW] `tsconfig.json` & `angular.json`
- Set up strict TypeScript compiling rules.
- Configure the Angular workspace to build to `dist/travel-tracker-public/browser` (default Angular 17+ build path).

#### [NEW] `.husky/` and `lint-staged.config.js`
- Set up Husky for pre-commit hooks to ensure `npm run lint` and **`npm run format` (using Prettier)** run on all staged files.

#### [NEW] `developer.md` (Update)
- Add comprehensive instructions for the new tooling.
- Provide links to official documentation (Angular CLI, TypeScript, ESLint, Prettier, Husky).
- Document how to serve, build, lint, and test the project locally.

### Phase 2: GitHub Actions CI/CD Pipeline
We will set up an automated workflow for deploying the site via GitHub Actions Pages deployment.

#### [NEW] `.github/workflows/deploy.yml`
(GitHub Actions YAML defining the build and upload-pages-artifact steps for deployment without branches).

#### Idiot-Proof GitHub Pages Configuration
1. Go to your repository on GitHub.
2. Click on **Settings** (the gear icon at the top).
3. On the left sidebar, scroll down and click on **Pages**.
4. Under **Build and deployment**, ensure **Source** is set to **GitHub Actions**.
5. You DO NOT need to select a branch manually here. Once the `deploy.yml` action runs successfully for the first time on `main`, your site will be live!

### Phase 3: Incremental File Conversion Strategy
1. Create a new `src/` folder for the Angular application.
2. Copy the existing JS files into `src/assets/legacy/`.
3. Load the legacy scripts in `angular.json` so the app functions as before, but served via Angular's dev server.
4. **One File at a Time**: Convert foundational utility functions (`helpers.js`, `data_constants.js`, `state.js`) into pure TypeScript utilities (`src/app/utils/`) or Angular Services (`src/app/services/`). We will add strict typings (`interfaces`, `types`) during the conversion.

### Phase 4: Generic Componentization & Agent Workflow
This phase mandates a slow, highly-structured agent workflow. We will *not* convert everything at once. 

**For each component listed in Phase 5, the Agent MUST follow this explicit Loop/Stop/Verify process:**

1. **Plan & Extract**: Extract the converted TypeScript functions/logic from Phase 3 into the new Angular component or utility section.
2. **Scaffold & Migrate**: Generate the component. Move the specific HTML/CSS from the monolithic `index.html` into the component's template. Move the logic into the component class.
3. **Verify locally**: Serve the app. Manually verify the component satisfies the detailed OpenSpec Claim.
4. **Document**: Update `tasks.md` and `walkthrough.md` with the changes made in this iteration.
5. **STOP**: The agent MUST halt execution, present the completed component deliverable to the user, and wait for explicit human review and approval before starting the next component. One session / run per iteration.

### Phase 5: Component Types and Deliverables (Deep Dive)
Based on the existing codebase in `app.js` and `ui.js`, the application will be broken down into the following discrete OpenSpec deliverables. The full, exhaustive specification for each claim will be stored under the `openspec/` directory.

#### Deliverable #1: LocalStorage & State Service
- **Spec**: `openspec/01-localstorage-service.md`
- **Detailed Claim**: The `StorageService` shall manage serialization and deserialization of `np_travel_settings` (hometowns, family members, map modes, API keys) and `np_travel_tracker_v3` (visited parks, states, metadata, saved routes). It must gracefully handle missing or malformed keys. **CRITICAL SECURITY**: It must ensure API keys are strictly excluded from any export/backup serialization. The `StateService` must broadcast reactive updates (RxJS Behaviorsubjects) for: current active tab (Parks/States/Roads), global search term, filtered members, map visibility settings, and modal visibility states.

#### Deliverable #2: Map View Component
- **Spec**: `openspec/02-map-view.md`
- **Detailed Claim**: The `MapComponent` shall initialize a Leaflet map with boundaries centered appropriately depending on selected filters (US vs Canada vs Both). It shall dynamically render custom colored pins for Parks and States based on whether a family member has visited. It must render polylines for saved road trips using Mapbox or OSRM data. It must override the default Leaflet tooltip CSS to force larger width for readability. Clicking a pin must trigger a global event stream that opens the Edit Modal directly.

#### Deliverable #3: Global Search Component
- **Spec**: `openspec/03-global-search.md`
- **Detailed Claim**: The `SearchComponent` shall provide a sticky, accessible search input that debounces and updates the global `searchTerm`. It must dynamically query the `StateService` to show a "X results" badge based on matches in the currently active tab (filtering the Visited List and the Map Markers simultaneously). It must provide an "x" clear button that clears the term and resets the view instantly.

#### Deliverable #4: Settings Modal Component
- **Spec**: `openspec/04-settings-modal.md`
- **Detailed Claim**: The `SettingsComponent` shall provide a tabbed modal to configure app behavior. It must: support adding/removing unlimited family members and color-coding them; use Nominatim geocoding to save/remove multiple "Hometown" locations; allow toggling routing engines (OSRM vs Mapbox) and entering a Mapbox API key; handle route reduction tolerance inputs. It must deliberately omit the legacy US/Canada global switch, enabling both domains entirely by default across the app.

#### Deliverable #5: Road Trips & Route Builder Component
- **Spec**: `openspec/05-road-trips.md`
- **Detailed Claim**: This component manages the entire "Road Trips" tab. It shall display the list of saved road trips, allowing users to view, edit, or delete them. For creating/editing routes, the `RouteBuilder` interface shall handle input for start/end points and waypoints, perform geocoding, fetch alternative routes from Mapbox/OSRM, and allow the user to select and save a route. It must visually differentiate the selected route polyline, and parse/save the distance, duration, and coordinate arrays into `localStorage`.

#### Deliverable #6: Stats Widget Component
- **Spec**: `openspec/06-stats-widget.md`
- **Detailed Claim**: The `StatsWidgetComponent` shall conditionally render progress bars based on the active tab (Parks/States/Roads). For States/Parks, it must calculate unique visit counts against the total dataset, break down stats regionally (US vs Canada), and show individualized completion bars per family member. For Roads, it must show total distance, duration, completed vs planned trips, and per-member participation metrics.

#### Deliverable #7: Parks & States Data Tables (Modals)
- **Spec**: `openspec/07-data-tables.md`
- **Detailed Claim**: The `DataTablesComponent` shall display the full dataset array (100+ items) in a grid. It must provide dynamic column headers for each configured family member. It must support multi-column sorting (Asc/Desc on Name, Region, Member Visit). Clicking a cell must toggle the visit state (`true`/`false`) synchronously via `StateService`. It must include a region filter and a "View All / Single Member" filter.

#### Deliverable #8: Visited List Component (Below Map)
- **Spec**: `openspec/08-visited-list.md`
- **Detailed Claim**: The `VisitedListComponent` shall render a masonry or flex card layout below the map. It must display only locations marked as "visited" by at least one family member. Each card must show: Location Name, Region, a badge for each member who visited, the visit date (if present in metadata), and a truncated comment. It must dynamically filter these cards based on the global `searchTerm`.

#### Deliverable #9: Edit Visit Metadata Modal Component
- **Spec**: `openspec/09-edit-metadata-modal.md`
- **Detailed Claim**: The `EditVisitModalComponent` shall accept a `LocationName` and `Type` (Park/State) input. It must render an HTML date picker and a text area with a live character count. It must read existing metadata from the `StateService` on open, and save/override that data precisely back to `localStorage` on submit, instantly reflecting the changes on the Map Tooltips and Visited List cards.

#### Deliverable #10: Data Management Component (Import/Export)
- **Spec**: `openspec/10-data-management.md`
- **Detailed Claim**: The `DataManagementComponent` shall parse the current reactive state into multiple formats. It must map data to a strictly formatted 2D array and utilize `SheetJS (xlsx)` to generate and download Excel (.xlsx) and CSV files. It must serialize the entire state to a `.json` blob for backup, **while strictly stripping any API keys before export**. It must also provide a file upload parser to ingest `.json` backups or `.csv` sheets, strictly validating schema before destructively overwriting the active application state.
