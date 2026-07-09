import { RouteObject } from './route.model';

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

export interface VisitDetail {
  memberId: string;
  dateVisited?: string; // YYYY-MM-DD
  notes?: string;
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
  routeReduction: number;
  savedRoutes: RouteObject[];
  visitedStates?: Record<string, VisitDetail[]>;
  visitedParks?: Record<string, VisitDetail[]>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  familyMembers: [],
  hometowns: [],
  routingEngine: 'osrm',
  routeReduction: 0.01,
  savedRoutes: [],
  visitedStates: {},
  visitedParks: {},
};
