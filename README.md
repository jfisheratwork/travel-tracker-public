# Travel Tracker

A serverless static web application to track visits to National Parks, States/Provinces, and road trip routes for the whole family. The app runs completely on the client side and stores all visit logs securely in local storage.

---

## 📖 Architecture & Design
For a detailed technical breakdown of the components, data flows, and test environment design, see [architecture.md](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/architecture.md).

---

## 🛠️ Project Structure

The project has been modularized into separate frontend script files to enable easy concurrent development and cleaner code boundaries:

*   **[docs/index.html](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/index.html)**: Main HTML structure, Tailwind CSS loading, and Leaflet map container.
*   **[docs/css/style.css](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/css/style.css)**: Custom interface layout overrides, print settings, and animation stylesheets.
*   **[docs/js/helpers.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/helpers.js)**: Pure functional utilities (e.g. coordinates distance calculators, HTML sanitizers, list groupers, and JSON schema migrations).
*   **[docs/js/state.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/state.js)**: State definition variables, color palettes, and LocalStorage load/save syncing.
*   **[docs/js/map.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/map.js)**: Leaflet map controller, markers formatting, popup templates, and driving polylines.
*   **[docs/js/ui.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/ui.js)**: DOM render engines, data table sorters, settings checklists, and modal controllers.
*   **[docs/js/app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)**: Main orchestrator (event listeners, backup restoration, OSRM/Mapbox routing requests).

---

## 🚀 Setup and Running Locally

To run this project locally, you'll need Python installed. We recommend using Homebrew on macOS.

### 1. Install Homebrew (if not installed)
Paste the following command in your terminal:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Python
```bash
brew install python
```

### 3. Run the Local Server
Navigate to the project directory in your terminal and start the server from the `docs` folder:

```bash
cd docs
python3 -m http.server 8080
```

Then open your browser and go to [http://localhost:8080/](http://localhost:8080/)

---

## 🧪 Running Unit Tests

The project includes an automated unit test suite verifying data formatting, date grouping, local storage migrations, HTML sanitization, and routing selection toggles.

To execute the test runner locally, run:
```bash
node tests/app.test.js
```

---

## 🌐 Deployment

This project is hosted on GitHub Pages. The site is served from the `docs/` folder on the `main` branch.

Every time a commit is pushed to the `main` branch, GitHub automatically rebuilds and deploys the site. The changes should be live within a few minutes.

The application is published at:
[https://jfisheratwork.github.io/travel-tracker-public/](https://jfisheratwork.github.io/travel-tracker-public/)

---

## 💾 Data Management

### Local Storage & Privacy
Your travel data and settings are stored entirely in your browser's **Local Storage**. 
- No data is sent to any external server. 
- Your privacy is preserved as everything stays on your device.
- **Note:** Clearing your browser cache or browsing history may delete this data.

### Resetting Data
If you wish to start over:
1. Open the **Settings** menu (gear icon).
2. Scroll to the bottom "Danger Zone".
3. Click **Reset**.
4. Confirm the action to delete all your tracked visits and custom family members.

### Backup & Restore
Since data is local, we highly recommend creating periodic backups:
1. Click the **Export / Restore** button.
2. Under "Full App Backup (JSON)", click **Download JSON Backup**.
3. Save this file safely. 
4. You can restore your data anytime by uploading this file in the same menu.

---

### Attribution
This entire project was generated with Google Gemini as a fun "try it out" experiment to demonstrate AI-assisted coding capabilities.