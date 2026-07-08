# Executive Summary
Implemented significant UI enhancements to the Route Builder and Map View based on legacy site behavior and new requirements. Added family member selection for routes, dynamic map rendering modes, and precise styling for active vs. inactive hometown markers.

# Outcomes
- Changed layout to stack Route Builder below the Map.
- Implemented `mapMode` in `StateService` and updated `map-view` to conditionally display features based on the mode (Parks, States, Roads).
- Added interactive selection and hover styling (yellow highlighting) to saved road trips in the Route Builder.
- Added a "Load All Routes on Map" button and dynamic start location auto-population based on the active hometown.
- Re-implemented legacy Map Marker logic (blue vs. gray backgrounds) for hometowns, accurately reproducing the `docs/js/map.js` functionality in Angular.

# Tasks Done
- Update `state.service.ts` to manage `mapMode`.
- Update `app.html` to change flex layout to a column layout and conditionally display the route builder.
- Add "Who Participated" section to `route-builder.html`.
- Add "Load All Routes on Map" button in `route-builder.html`.
- Apply hover highlight and yellow border logic to saved road trips in `route-builder.html`.
- Update `route-builder.ts` to manage family members array, populate `startQuery` dynamically based on active hometown, and clear `selectedRoute` for the "Load All" button.
- Subscribe to `selectedRoute$` in `map-view.component.ts` and conditionally render routes based on it.
- Update hometown markers in `map-view.component.ts` to use `#9ca3af` for non-active hometowns and `#3b82f6` for active.

# Tasks Not Done
- Re-add the Date Pickers in the Settings Modal (they were removed earlier as they caused infinite update loops).
- Fine-tune Map centering and zoom level (e.g. 200 miles with specific cities on the edge) logic.

# Prompt Log
- "Are these done or not?"
- "generally the zoom if its 200 miles should for spokane washington ahve spokane in the center and seattle on left edge"
- "map centering is borken"
- "also when I try to add a second home town it just jumps out of modal and never saves. You need to update tests to find out why"
- "there can only ever be one active lets just make it the last one and make it obvious inthe ui with a hamburger onleft side of city entry that it is draggable"
- "one step forward one step back. hometowns are drageable but now I can't add dates.thats ok for now note it for later."
- "marke these done"
- "try to fix these. Also note the listed items when we have multiple routes should highlight on ohover and border yellow when slected. make srue you look at @docs for reference on proper UI inclucidng the fact that usually we only redner the selected route but have the abilty to try to render all"
- "non active hometowns have a different icon refere back to the 'docs' js files"
- "shut down the sites/teminral"
- "we done"
