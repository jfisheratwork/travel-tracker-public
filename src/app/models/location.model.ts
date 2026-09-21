export interface Country {
  id: string; // e.g. 'US', 'CA', 'FR', 'JP'
  name: string; // e.g. 'United States', 'Canada'
  code: string; // ISO 2-letter code
  pinned?: boolean; // true for USA & Canada
}

export interface Region {
  id: string; // e.g. 'US-CA', 'US-IL', 'CA-AB', 'CA-BC'
  countryId: string; // References Country.id ('US', 'CA')
  code: string; // e.g. 'CA', 'IL', 'AB'
  name: string; // e.g. 'California', 'Illinois', 'Alberta'
}

export type PlaceCategory =
  | 'national_park'
  | 'state_park'
  | 'provincial_park'
  | 'city'
  | 'landmark'
  | 'theme_park'
  | 'custom';

export interface Place {
  id: string; // e.g. 'us-yosemite', 'sp-starved-rock', 'city-chicago', 'custom-12345'
  name: string; // e.g. 'Starved Rock State Park'
  category: PlaceCategory;
  countryId: string; // References Country.id (e.g. 'US', 'CA')
  regionId?: string; // References Region.id (e.g. 'US-IL', 'CA-AB')
  lat: number;
  lng: number;
  source: 'static' | 'user' | 'osm';

  // Optional compact flags for curated lists
  isCurated?: boolean; // True for static catalog places
  isCapital?: boolean; // National or state/provincial capital
  isMajorCity?: boolean; // Curated key city tier
  tags?: string[]; // e.g. ['hiking', 'camping', 'scenic']
}

export interface PlaceVisit {
  placeId: string; // References curated Place.id or custom Place.id
  memberId: string;
  status: 'visited' | 'want_to_visit';

  // Trip linkage (primary for modern travel)
  tripId?: string; // References Trip.id. Inherits trip dates & companions

  // Standalone fields (for historical visits or manual overrides)
  dateVisited?: string; // Optional date if standalone
  notes?: string; // Optional memories/notes
  tags?: string[]; // Optional tags assigned to this visit
}

export interface LocationPoint {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  visitedBy: string[];
  visited: boolean;
  wantToVisit?: boolean;
  country?: string;
  sub?: string;
  isCountryCapital?: boolean;
  category?: PlaceCategory | 'state' | 'hometown';
}

export type MapMode = 'parks' | 'states' | 'roads' | 'places';
