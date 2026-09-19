import { RouteObject } from './route.model';
import { ColorThemeId, DEFAULT_THEME_ID } from '../core/constants/theme.constants';

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

export interface AppSettings {
  familyMembers: FamilyMember[];
  hometowns: Hometown[];
  routingEngine: 'osrm' | 'mapbox';
  mapboxKey?: string; // Stored only locally, excluded from any future backend syncs
  cartoKey?: string; // CARTO basemap API Key
  routeReduction: number;
  savedRoutes: RouteObject[];
  visitedStates?: Record<string, VisitDetail[]>;
  visitedParks?: Record<string, VisitDetail[]>;
  locationVisits?: Record<string, VisitLogEntry[]>;
  colorTheme?: ColorThemeId;
}

export const DEFAULT_SETTINGS: AppSettings = {
  familyMembers: [],
  hometowns: [],
  routingEngine: 'osrm',
  routeReduction: 0.01,
  savedRoutes: [],
  visitedStates: {},
  visitedParks: {},
  colorTheme: DEFAULT_THEME_ID,
};
