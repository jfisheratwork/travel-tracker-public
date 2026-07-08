export interface Waypoint {
  lat: number;
  lng: number;
  name?: string; // Name for UI input retention
}

export interface RouteObject {
  // Unique Identifier
  id: string; // Helpful for Angular iterations and distinct route saving

  // UI & Metadata
  name: string; // Required
  description: string; // Optional (Notes)
  startDate?: string; // Optional
  endDate?: string; // Optional
  members: string[]; // Family members on the trip
  status: 'planned' | 'completed';

  // Routing Data
  engine: 'osrm' | 'mapbox';
  distance: number; // in meters
  duration: number; // in seconds
  timestamp: number;

  // Waypoints & Queries (for editing and recalculation)
  startQuery: string;
  endQuery: string;
  stopsQueries: string[];
  waypoints: Waypoint[]; // The minimal stateful waypoints (Start, Stops, End) to recreate the route

  // Polylines
  route: [number, number][]; // Full detailed polyline coordinates (lat, lng)
  coordinates?: [number, number][]; // Locally cached, reduced/smoothed polyline for rendering
}
