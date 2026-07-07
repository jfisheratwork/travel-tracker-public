# OpenSpec: 04 Settings Modal Component

## Overview
A configuration interface for users to customize their tracking experience, manage family members, and configure map providers.

## High-Level Architecture (Cross-Platform / iOS Ready)
The settings UI should be built as a form that binds to a distinct "Settings State" object. 
- **View Models**: Use intermediate View Models for the form to prevent instantly applying invalid settings to the global state. Apply changes only on "Save".
- **Abstract Configuration**: Map provider keys and routing preferences should be treated as abstract settings keys, easily replicable in iOS `UserDefaults`.

## Detailed Claim
The `SettingsComponent` shall provide a tabbed modal to configure app behavior.
- **Family Management**: Support adding/removing unlimited family members and assigning them distinct color codes.
- **Hometowns**: Use Nominatim geocoding to search for, save, and remove multiple "Hometown" locations.
- **Routing Engine**: Allow toggling between routing engines (OSRM vs Mapbox) and entering a custom Mapbox API key. Include route reduction tolerance inputs.
- **Global Scope**: It must deliberately omit the legacy US/Canada global switch, enabling both domains entirely by default across the app.

## Future Scope: Auth & Backend Storage
- **Profile Management**: In an authenticated world, this modal becomes the "User Profile". Family members become distinct user accounts or sub-profiles tied to the main account.
- **Backend Syncing**: Settings will be synced to the user's remote profile. API keys must remain strictly local or be heavily encrypted if synced. Hometowns and member colors will be stored in the user's remote document.
