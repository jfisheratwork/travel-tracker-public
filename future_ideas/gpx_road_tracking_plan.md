# Road Trip Tracking & GPX Integration Plan

This document outlines a strategy for adding a 3rd map mode to track driven roads and routes by importing GPX data.

## 1. Mapping and Displaying the Data
Since we are already using **Leaflet.js** for our maps, displaying roads is natively supported using Polylines (`L.polyline`) or GeoJSON (`L.geoJSON`).
* We would add a new mode toggle to the map: `Parks` | `States` | `Road Trips`.
* When "Road Trips" is active, instead of rendering point markers, the map will parse your stored road trip coordinate arrays and draw colorful, glowing lines across the map linking your routes together.

## 2. Getting and Parsing GPX Data
**What is GPX?** 
GPX is a standard GPS data format based on XML. It contains an ordered list of waypoints and track points (`<trkpt>`) representing your movement over time.

**How Do You Get It?**
* **Google Maps:** You can't natively hit an "Export GPX" button in Google Maps, but you *can* use third-party sites like [Maps to GPX](https://mapstogpx.com/) to convert a Google Maps directions URL into a downloadable GPX file.
* **Other Services:** Apps like Strava, Garmin, AllTrails, or Apple Health allow direct GPX exports of your recorded drives or hikes.

**How Does The App Read It?**
We would use a tiny JavaScript parsing library like `@tmcw/togeojson` or `leaflet-gpx`. It natively reads the raw XML of the GPX file you uploaded and converts it directly into a JavaScript array of `[Latitude, Longitude]` coordinates.

## 3. Creating an Easy Import Pipeline
We would add a visual **Dropzone** in the UI:
1. You drag-and-drop your `roadtrip.gpx` file into the app.
2. The JS library parses the file locally in your browser immediately.
3. A modal pops up asking you to Name the route (e.g., "Pacific Coast Highway 2025") and map it to a specific family member (optional).
4. The coordinates are stored in state and the line fades into the map view instantly.

## 4. The Major Engineering Challenge: Local Storage Limits
Saving coordinates isn't like saving `{ name: "Yosemite", visited: true }`. A single 5-hour drive recorded via GPS might contain **15,000 coordinate pairs**. This generates megabytes of data. 

Browser `localStorage` typically enforces a strict **5MB maximum limit** per site. If we save raw, uncompressed GPS files, your app will crash after uploading just 2 or 3 road trips.

### Solutions:
To make this work beautifully entirely in-browser, we would employ two algorithms before saving:
1. **Downsampling (Douglas-Peucker Algorithm):** We don't need sub-meter accuracy to see what roads you drove on a North American scale. We run a mathematical routine that analyzes curves and deletes 95% of strictly redundant points on a straight highway. A 10,000 point highway drive gets reduced to 100 points without heavily changing the shape.
2. **Polyline Encoding:** Turning an array of points `[[38.5, -120.2], [40.7, -120.9]]` into a single compressed string like `_p~iF~ps|U_ulLnnqC_mqN` saves huge amounts of JSON text space. Check out Google's [Encoded Polyline Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm).
3. **Bring Your Own Backend (BYOB):** Tracking heavy road data makes migrating to Firebase, Google Drive, or iCloud storage (as you've planned in `future_ideas/firebase_integration_plan.md`) much more appealing, as cloud accounts measure quotas in Gigabytes, not Megabytes.
