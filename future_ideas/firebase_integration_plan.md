# Firebase Backend Integration Plan

## Overview
This document outlines the plan to integrate **Google Firebase** into the Family Travel Tracker. 
**Goal:** Enable "Sign in with Google" to allow users to sync their travel data across multiple devices (phone, laptop, tablet), replacing the current device-only `localStorage`.

---

## Phase 1: Account & Project Setup

1.  **Create a Firebase Project**
    *   Go to [console.firebase.google.com](https://console.firebase.google.com/).
    *   Click **"Add project"** and name it `family-travel-tracker` (or similar).
    *   Disable Google Analytics (keep it simple for now).
    *   Click **"Create project"**.

2.  **Register the Web App**
    *   In the Project Overview, click the **Web icon (`</>`)**.
    *   App nickname: `Travel Tracker Web`.
    *   **Uncheck** "Also set up Firebase Hosting" (we will stay on GitHub Pages for now).
    *   Click "Register app".
    *   **Copy the `firebaseConfig` object** shown on the screen. You'll need this later.

3.  **Enable Authentication**
    *   Go to **Build > Authentication** in the left sidebar.
    *   Click "Get Started".
    *   Select **Google** from the Sign-in method list.
    *   Toggle "Enable".
    *   Select your support email.
    *   Click "Save".

4.  **Create Firestore Database**
    *   Go to **Build > Firestore Database**.
    *   Click "Create database".
    *   **Location:** Choose a region close to you (e.g., `nam5` for US).
    *   **Rules:** Start in **Test mode** (allows read/write for 30 days) to make development easy. We will lock this down in Phase 4.

---

## Phase 2: Database Schema Design

We will transition from a single monolithic LocalStorage JSON string to a document-based structure.

**Collection:** `users`
**Document ID:** `[User UID from Auth]` (e.g., `v7s8f7s8df7s8d`)

**Document Fields:**
```json
{
  "parks": {
    "Yellowstone_John": true,
    "Acadia_Jane": true
  },
  "states": {
    "California_John": true
  },
  "meta": {
    "parks": { ... },
    "states": { ... }
  },
  "settings": {
    "familyMembers": ["John", "Jane"],
    "showUSA": true,
    // ...
  },
  "lastUpdated": "Timestamp"
}
```

---

## Phase 3: Code Implementation

### 1. Add Firebase SDKs (`index.html`)
Add these scripts *before* your own scripts in `index.html`.

```html
<!-- Firebase App (the core Firebase SDK) -->
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"></script>
<!-- Firebase Products being used -->
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"></script>
```

### 2. Initialize Firebase (`js/firebase-init.js`)
Create a new file to act as the backend connection layer.

```javascript
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  // PASTE YOUR CONFIG OBJECT HERE FROM STEP 1
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export for app.js to use
export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc };
```

### 3. Update Application Logic (`js/app.js` or `js/storage.js`)
You need to create a **Storage Manager** that decides where to read/write data.

```javascript
import { auth, db, doc, getDoc, setDoc } from './firebase-init.js';

let currentUser = null;

// Listen for login state changes
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        console.log("User logged in:", user.email);
        loadFromCloud(user.uid);
        updateUIForLogin(user);
    } else {
        console.log("User logged out");
        // Fallback to local storage or clear data
        loadFromLocal();
        updateUIForLogout();
    }
});

// Sync Function
async function save(data) {
    // 1. Always save to LocalStorage (offline backup)
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(data));

    // 2. If logged in, save to Cloud
    if (currentUser) {
        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                ...data,
                lastUpdated: new Date()
            });
            showSavingIndicator(true);
        } catch (e) {
            console.error("Error saving to cloud: ", e);
            showError("Cloud sync failed");
        }
    }
}
```

### 4. Update UI (`index.html`)
Add a new **Login/User Profile** section to the header or settings modal.

```html
<!-- Before Login -->
<button id="btn-login" class="bg-blue-600 text-white px-4 py-2 rounded">
  Sign in with Google
</button>

<!-- After Login (Hidden by default) -->
<div id="user-profile" class="hidden flex items-center gap-2">
  <img id="user-avatar" src="" class="w-8 h-8 rounded-full" />
  <span id="user-name" class="font-bold"></span>
  <button onclick="logout()" class="text-sm underline">Logout</button>
</div>
```

---

## Phase 4: Security & Deployment

### 1. Configure Authorized Domains
To prevent API key theft from being useful on other sites:
1.  Go to **Firebase Console > Authentication > Settings > Authorized Domains**.
2.  Add your domains:
    *   `localhost`
    *   `jacobfisher.github.io` (Your GitHub Pages domain)

### 2. Set Firestore Security Rules
Go to **Firestore Database > Rules** and replace everything with this secure configuration:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Lock down everything by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Allow users to only read/write their OWN document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
This ensures User A can never read or overwrite User B's travel data.

### 3. Push to GitHub
Simply commit and push your changes. Since Firebase runs entirely in the browser (client-side), GitHub Pages works perfectly with no extra configuration.
