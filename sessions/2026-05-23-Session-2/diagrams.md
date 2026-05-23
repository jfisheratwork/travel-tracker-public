# Architecture Diagrams

This document contains Mermaid-based architecture diagrams illustrating the components and state flow of the Family Travel Tracker.

## Component Interaction Flow

The frontend application operates locally, loading static constants, reading/writing settings to `localStorage`, rendering markers on a Leaflet map, and fetching road paths from public/private routing engines.

```mermaid
graph TD
    UI["index.html (Tailwind UI)"] -->|User Action| App["app.js (Application State)"]
    App -->|Reads/Writes| Storage["localStorage (np_travel_settings)"]
    App -->|Updates UI / Renders Markers| Map["Leaflet Map (worldMap)"]
    App -->|API Request| Router["Routing Engine (OSRM / Mapbox)"]
    Router -->|Road-following Coordinates| App
    Constants["data_constants.js (Parks/States Data)"] -->|Loads static list| App
```

## State & Data Flow (Hometowns & Routes)

```mermaid
graph LR
    LocalData["LocalStorage Settings"] -->|1. Initialize| AppState["App State (hometowns: Array)"]
    AppState -->|2. Plot Markers| Leaflet["Leaflet Map"]
    UserHome["User Action (Add Hometown)"] -->|3. Geo-Search| Nominatim["Nominatim Search API"]
    Nominatim -->|4. Coordinates| AppState
    AppState -->|5. Save| LocalData
```
