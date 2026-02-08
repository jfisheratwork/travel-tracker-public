# Travel Tracker

A simple web application to track your travels.

## Setup and Running Locally

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

### 3. Run the local server
Navigate to the project directory in your terminal and start the server from the `docs` folder:

```bash
cd docs
python3 -m http.server 8000
```

Then open your browser and go to [http://localhost:8000/](http://localhost:8000/)

## Deployment

This project is hosted on GitHub Pages. The site is served from the `docs/` folder on the `main` branch.

Every time a commit is pushed to the `main` branch, GitHub automatically rebuilds and deploys the site. The changes should be live within a few minutes.

The application is published at:
[https://jfisheratwork.github.io/travel-tracker-public/](https://jfisheratwork.github.io/travel-tracker-public/)

## Data Management

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