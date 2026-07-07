# OpenSpec: 01 LocalStorage & State Service

## Overview
This service is the core data layer for the Travel Tracker application. It manages the application's reactive state and handles data persistence. 

## High-Level Architecture (Cross-Platform / iOS Ready)
To ensure this logic can be ported to iOS (e.g., using SwiftData or CoreData) or other frameworks, the architecture must decouple the **State Management** (in-memory, reactive data streams) from the **Storage Mechanism** (how data is saved/loaded). 
- **State Service**: Manages reactive streams (e.g., RxJS `BehaviorSubject` in Angular, or `@Published` properties in Swift).
- **Storage Adapter Interface**: An abstract interface defining `save()`, `load()`, and `clear()` methods. The web app will implement this using `localStorage`.

## Detailed Claim
The `StorageService` shall manage serialization and deserialization of:
- `np_travel_settings`: Hometowns, family members, map modes, API keys.
- `np_travel_tracker_v3`: Visited parks, states, metadata, saved routes.

### Requirements
- **Reactive Updates**: The `StateService` must broadcast updates for: current active tab, global search term, filtered members, map visibility settings, and modal visibility states.
- **Graceful Error Handling**: It must gracefully handle missing or malformed keys during deserialization.
- **Security**: It must ensure API keys are strictly excluded from any export/backup serialization.

## Future Scope: Auth & Backend Storage
While currently out of scope, the architecture must support a future cloud backend (e.g., Firebase Auth + Firestore, or a custom REST API).
- **Offline-First**: The `StorageService` will become an offline-first caching layer. Local changes will be applied instantly in-memory and to local storage, then queued for synchronization.
- **Remote Storage Adapter**: A new implementation of the Storage Adapter Interface will handle pushing/pulling diffs to the remote backend when the user is authenticated.
- **Conflict Resolution**: The data models should include `lastModified` timestamps to support basic eventual consistency and conflict resolution when syncing multiple clients.
