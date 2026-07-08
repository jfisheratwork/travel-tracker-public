# Next Steps: OpenSpec Migration

1. **Road Trips Migration**
   - We need to migrate the legacy Road Trips feature to the new Angular architecture.
   - This involves handling polyline parsing and mapping route files onto the Leaflet map.
   - See `docs/js/demo_route.js` and `docs/js/map.js` for the old implementations.

2. **Stats Widget Migration**
   - We need to implement the stats dashboard.
   - This will involve calculating total states visited, national parks visited, etc., and rendering them in an overlay or modal.
   - Needs to securely pull data from the new `StateService`.

3. **Backend Integration**
   - The user mentioned eventually needing a privately hosted DB-backed store for this data. Ensure that state abstractions remain clean so an API layer can easily replace `LocalStorageService` in the future.
