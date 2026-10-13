---
name: gis-and-state-audit
description: Standardizes auditing Leaflet GIS layers, coordinate math, OSRM/Mapbox/Nominatim network resilience, RxJS state streams, and Schema V4 migrations.
---

# GIS, Reactive State & Schema Migration Audit Skill

Use this skill when modifying or auditing `StateService`, `LocalStorageService`, `LocationDataService`, `MapShadingService`, `MapMarkerService`, `MapRouteService`, or `TripDeltaService`.

## 1. Reactive State & Schema V4 Invariants

1. **Backward-Compatible Migrations (`LocalStorageService`)**:
   - Any schema update must preserve lossless migration from legacy V1–V3 storage payloads into Schema V4 (`placeVisits`, `trips`, `customPlaces`).
   - All persistence operations must flow through `LocalStorageService` rather than direct `localStorage.setItem()` calls.
2. **Parent Region & Country Roll-Up (`StateService` & `ParksStatesModal`)**:
   - Marking a curated or custom place as visited (`status === 'visited'`) for a family member must automatically roll up and mark its parent `regionId` (US State / Canadian Province) and `countryId` (`GLOBAL_COUNTRIES`) as visited for that member.
3. **Option A Trip Stop Classification (`TripService` & `TripDeltaService`)**:
   - `destination` and `overnight` stops count as visited places; `waypoint` and `pass_through` stops route geometry without inflating visited place statistics.

## 2. Leaflet GIS & Layer Invariants

1. **Pure GIS Math (`geo.utils.ts`)**:
   - Coordinate reduction and bounding-box calculations must remain pure functions with zero DOM or Leaflet side effects and zero magic numbers.
2. **Popup XSS Protection (`map-popup.util.ts`)**:
   - All user-entered strings (custom place names, trip titles, visit notes, member names) interpolated into Leaflet HTML popups must pass through `escapeHtml()`.
3. **Marker & Shading Consistency**:
   - Unvisited places are hidden on the map by default unless `showUnvisited` is enabled.
   - State capitals only render as visited markers when the capital city itself is visited, never merely because the parent state was visited.

## 3. Verification Commands

```bash
make lint
make lint-rules
make test
```
