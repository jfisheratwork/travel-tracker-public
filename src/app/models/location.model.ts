export interface LocationPoint {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  visitedBy: string[];
  visited: boolean;
  country?: string;
  sub?: string;
  isCountryCapital?: boolean;
}

export type MapMode = 'parks' | 'states' | 'roads';
