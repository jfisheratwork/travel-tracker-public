# Developer Guide & Onboarding

Welcome to the Family Travel Tracker development guide. This document outlines how to set up, develop, and run tests for this application.

## Prerequisites

To run this project locally and execute tests, you need **Node.js** (version 18 or higher recommended).

### Installation via Homebrew (macOS)
1. If you do not have Homebrew installed, install it first from [brew.sh](https://brew.sh/).
2. Install Node.js:
   ```bash
   brew install node
   ```
3. Verify the installation:
   ```bash
   node --version
   npm --version
   ```

---

## Local Development Server

Since the app relies on fetching local JS/CSS modules and preloaded data, running it via a local HTTP server is required (to avoid CORS policies on `file://` protocols).

Start a simple local HTTP server from the repository root:
- Using Python 3:
  ```bash
  python3 -m http.server 8000
  ```
- Or using Node's `npx`:
  ```bash
  npx http-server -p 8000
  ```

Open your browser and navigate to `http://localhost:8000/docs/index.html`.

---

## Running Tests

This project uses the native Node.js test runner (introduced in Node.js 18), requiring no external packages like Jest or Mocha.

### Run all tests
From the root directory, run:
```bash
node --test tests/*.test.js
```

### Run specific test file
```bash
node --test tests/helpers.test.js
```

---

## Appendix: Open Source Libraries

The application uses the following libraries loaded via CDNs:

| Library Name | GitHub Repository | Documentation Page | Release Notes | Description |
|---|---|---|---|---|
| **Leaflet Maps** | [Leaflet/Leaflet](https://github.com/Leaflet/Leaflet) | [leafletjs.com/reference](https://leafletjs.com/reference.html) | [Leaflet Releases](https://github.com/Leaflet/Leaflet/releases) | Mobile-friendly interactive maps library used to plot paths and markers. |
| **Tailwind CSS** | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | [tailwindcss.com/docs](https://tailwindcss.com/docs) | [Tailwind Releases](https://github.com/tailwindlabs/tailwindcss/releases) | Utility-first CSS framework for layout styling. |
| **SheetJS (xlsx)** | [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs) | [docs.sheetjs.com](https://docs.sheetjs.com/) | [SheetJS Changelog](https://github.com/SheetJS/sheetjs/blob/master/CHANGELOG.md) | Parser and writer for various spreadsheet formats (Excel, CSV). |
