export interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

export interface Hometown {
  id: string;
  name: string;
  lat: number;
  lng: number;
  startDate?: string; // e.g. "2015-05"
  endDate?: string; // e.g. "2020-08", omitted if current
}

export interface SavedRoute {
  name: string;
  route: [number, number][]; // Array of [lat, lng] coordinates
}

export interface AppSettings {
  familyMembers: FamilyMember[];
  hometowns: Hometown[];
  routingEngine: 'osrm' | 'mapbox';
  mapboxKey?: string; // Stored only locally, excluded from any future backend syncs
  routeReduction: number;
  savedRoutes: SavedRoute[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  familyMembers: [],
  hometowns: [],
  routingEngine: 'osrm',
  routeReduction: 0.01,
  savedRoutes: [],
};
