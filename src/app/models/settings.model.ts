import { RouteObject } from './route.model';
import { Trip } from './trip.model';
import { Place, PlaceVisit } from './location.model';
import { ColorThemeId, DEFAULT_THEME_ID } from '../core/constants/theme.constants';
import { environment } from '../../environments/environment';

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

export interface VisitLogEntry {
  id: string;
  dateVisited: string; // YYYY-MM-DD
  comments?: string;
}

export interface VisitDetail {
  memberId: string;
  dateVisited?: string; // YYYY-MM-DD (legacy / first visit)
  firstVisitedDate?: string; // YYYY-MM-DD
  notes?: string;
  visits?: VisitLogEntry[];
}

export interface Hometown {
  id: string;
  name: string;
  lat: number;
  lng: number;
  startDate?: string; // e.g. "2015-05"
  endDate?: string; // e.g. "2020-08", omitted if current
}

export const DEFAULT_TAGS: string[] = [
  'camping',
  'hiking',
  'scenic',
  'historic',
  'beach',
  'national_park',
  'state_park',
  'city',
];

export interface AppSettings {
  schemaVersion: number;
  familyMembers: FamilyMember[];
  hometowns: Hometown[];
  trips: Trip[];
  customPlaces: Place[];
  placeVisits: Record<string, PlaceVisit[]>;
  tags: string[];

  routingEngine: 'osrm' | 'mapbox';
  mapboxKey?: string; // Stored only locally, excluded from any future backend syncs
  cartoKey?: string; // CARTO basemap API Key
  routeReduction: number;
  savedRoutes: RouteObject[];
  visitedStates?: Record<string, VisitDetail[]>;
  visitedParks?: Record<string, VisitDetail[]>;
  wantToVisitStates?: Record<string, VisitDetail[]>;
  wantToVisitParks?: Record<string, VisitDetail[]>;
  locationVisits?: Record<string, VisitLogEntry[]>;
  colorTheme?: ColorThemeId;
}

const hasEnvMapbox = !!(environment?.mapboxKey && environment.mapboxKey !== 'YOUR_MAPBOX_API_KEY');

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 4,
  familyMembers: [],
  hometowns: [],
  trips: [],
  customPlaces: [],
  placeVisits: {},
  tags: DEFAULT_TAGS,
  routingEngine: hasEnvMapbox ? 'mapbox' : 'osrm',
  routeReduction: 0,
  savedRoutes: [],
  visitedStates: {},
  visitedParks: {},
  wantToVisitStates: {},
  wantToVisitParks: {},
  colorTheme: DEFAULT_THEME_ID,
};
