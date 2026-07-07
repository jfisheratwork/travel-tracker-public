# OpenSpec: 09 Edit Visit Metadata Modal Component

## Overview
A modal interface for adding detailed metadata (dates, comments, photos) to a specific visited location.

## High-Level Architecture (Cross-Platform / iOS Ready)
This modal acts as a form for a specific location entity.
- **Entity Identification**: The modal must accept a unique identifier for the location (e.g., `LocationName` and `Type`).
- **State Hydration**: On open, it reads the current metadata for that entity from the `StateService`. On save, it dispatches an update back.

## Detailed Claim
The `EditVisitModalComponent` shall accept a `LocationName` and `Type` (Park/State) input.
- **Form Controls**: It must render an HTML date picker and a text area with a live character count.
- **Read/Write**: It must read existing metadata from the `StateService` on open, and save/override that data precisely back to `localStorage` (via the service) on submit.
- **Reactivity**: Submitting the form must instantly reflect the changes on the Map Tooltips and Visited List cards.

## Future Scope: Auth & Backend Storage
- **Media Uploads**: This modal will be the entry point for uploading photos or videos associated with a visit. The component will need to interface with a cloud storage service (e.g., AWS S3, Firebase Storage) and save the resulting asset URLs to the backend database.
- **Collaborative Editing**: If multiple family members have the app, metadata edits could be attributed to specific users, or locked to the user who created the visit record.
