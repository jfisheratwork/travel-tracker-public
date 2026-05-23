# Feature Comparison: Travel Tracker vs. Fog of the World

Our background web-browsing agent has completed a deep dive into the mobile app "Fog of the World" to help benchmark against the web architectures we are currently building. Below is the full research breakdown contrasting their mapping concepts against our routing architecture.

## How "Fog of the World" Works
- **Recording Method:** Primarily uses **live GPS tracking** in the background. It records the user's exact movements in real-time to create an authentic, high-fidelity path of everywhere they have physically been down to the exact sidewalk or detour.
- **Unfogging Mechanic:** The map begins completely obscured by a "fog" overlay. As the user moves, the fog is permanently wiped away along their path, revealing the underlying map. This creates a visual "trail" of discovery.
- **Data Storage:** It stores a high volume of raw GPS coordinate pairs locally. While it heavily optimizes this data for rendering the clear tiles, it essentially acts as a massive lifetime archive of raw movement points.
- **Gamification:** The app leans strictly into gamification with levels, achievements, and statistics (e.g., "0.000001% of the world uncovered"). 

## Feature Contrast

| Feature | **Fog of the World** | **Travel Tracker (Our App)** |
| :--- | :--- | :--- |
| **Input Method** | **Passive/Automatic**: Real-time background GPS tracking continuously pings the phone. | **Active/Manual**: Point A to Point B manual geocoding or dragging/dropping GPX files. |
| **Path Fidelity** | **Raw Tracks**: Records exactly where you moved (e.g. detours, sidewalks, walking around a grocery store). | **Snapped-to-Road**: Uses routing engines (Mapbox/OSRM) to infer the highway route, resulting in clean, abstract curves. |
| **Data Storage** | **High Volume**: Stores millions of raw coordinate pairs. | **Highly Optimized**: Uses Douglas-Peucker reduction dynamically to minimize storage footprint on large devices. |
| **Visual Style** | **Fog of War**: Hidden map revealed by travel like a strategy game. | **Clean Dashboard**: Colorful route bands drawn over a fully visible CartoDB base map. |
| **Primary Goal** | **Discovery/Coverage**: Encourages exploring every street and completely scraping a city map. | **Logging/Journals**: Focused on documenting specific, memorable road trips. |
| **Battery Life** | **High Impact**: Continuous background GPS usage heavily drains mobile batteries. | **Negligible**: A single lightweight API call per saved trip with zero active background tracking. |
| **Editability** | **Difficult**: It is notorious for being hard to "undo" a specific path if you accidentally track a flight. | **Simple**: Easy to delete or route ad-hoc trips with our Settings list UI. |

## Key Takeaway
While *Fog of the World* is an immersive, gamified tool for obsessive explorers who want to record every physical step of their lives on a grid, **Travel Tracker** serves a wildly different objective: a lightweight, battery-efficient, cloud-agnostic dashboard for retroactively logging major travels. Our "snap-to-road" routing engine approach guarantees that even if a user forgot to track a trip live, they can perfectly recreate it months later with pristine mapping graphics.
