---
name: visual-verification
description: Executes interactive Angular UI, Leaflet map canvas, and developer console verification using Chrome DevTools MCP and the local Angular development server.
---

# Visual & Developer Console Verification Skill

Use this skill to fulfill the Mandatory Validation Loop (Rule 9 of `AGENTS.md`) after modifying Angular components, HTML templates, CSS styles, or Leaflet map layer services.

## 1. Local Server Readiness

1. Verify the Angular dev server is running on port `4200` (`http://localhost:4200`).
2. If not running, start the development server via `make dev` or `npm start`.

## 2. Chrome DevTools MCP Inspection Workflow

Use the `chrome-devtools-mcp` server via `call_mcp_tool` to inspect the live application without running the full Playwright suite:

1. **Navigate or Select Page**:
   - Call `list_pages` or `navigate_page` targeting `http://localhost:4200`.
2. **Audit Developer Console**:
   - Call `list_console_messages` (`{ "pageId": 1, "types": ["error", "warn"] }`) to verify zero runtime `error` messages or unhandled promise/observable errors.
3. **Interactive State, Map & Modal Testing**:
   - Use `click`, `fill`, or `evaluate_script` to open modals (`ParksStatesModal`, `SettingsModal`, `StatsModal`, `LocationDetailModal`, `AiTripModal`) and test dismiss behaviors.
   - Verify Leaflet map shading (`MapShadingService`), custom DivIcon markers (`MapMarkerService`), route polylines (`MapRouteService`), and filter menus render cleanly.
4. **Visual Evidence**:
   - Call `take_screenshot` to capture visual verification for `UserWalkthrough.md` or walkthrough artifacts.
