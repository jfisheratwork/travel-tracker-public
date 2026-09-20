import { describe, it, expect } from 'vitest';
import * as L from 'leaflet';
import {
  calculateClusterBounds,
  calculateStatusSummary,
  resolveStackedCardColors,
  groupMarkersIntoClusters,
  EnrichedLocationPoint,
} from './map-cluster.util';
import { COLOR_THEMES, DEFAULT_THEME_ID } from '../../../core/constants/theme.constants';

describe('map-cluster.util', () => {
  const theme = COLOR_THEMES[DEFAULT_THEME_ID];

  describe('calculateClusterBounds', () => {
    it('returns empty bounds for empty list', () => {
      const bounds = calculateClusterBounds([]);
      expect(bounds).toEqual([
        [0, 0],
        [0, 0],
      ]);
    });

    it('expands delta for single point', () => {
      const item: EnrichedLocationPoint = {
        id: 'p1',
        name: 'Park 1',
        lat: 37.5,
        lng: -112.0,
        region: 'UT',
        visited: true,
        visitedBy: [],
      };
      const bounds = calculateClusterBounds([item]);
      expect(bounds[0][0]).toBeCloseTo(37.45);
      expect(bounds[0][1]).toBeCloseTo(-112.05);
      expect(bounds[1][0]).toBeCloseTo(37.55);
      expect(bounds[1][1]).toBeCloseTo(-111.95);
    });

    it('computes correct min and max for multiple points', () => {
      const items: EnrichedLocationPoint[] = [
        {
          id: 'p1',
          name: 'P1',
          lat: 37.0,
          lng: -113.0,
          region: 'UT',
          visited: true,
          visitedBy: [],
        },
        {
          id: 'p2',
          name: 'P2',
          lat: 38.5,
          lng: -111.5,
          region: 'UT',
          visited: false,
          visitedBy: [],
        },
      ];
      const bounds = calculateClusterBounds(items);
      expect(bounds).toEqual([
        [37.0, -113.0],
        [38.5, -111.5],
      ]);
    });
  });

  describe('calculateStatusSummary', () => {
    it('accurately counts visited, partial, and unvisited items', () => {
      const items: EnrichedLocationPoint[] = [
        {
          id: 'p1',
          name: 'P1',
          lat: 37,
          lng: -112,
          region: 'UT',
          isAllVisited: true,
          visited: true,
          visitedBy: [],
        },
        {
          id: 'p2',
          name: 'P2',
          lat: 37,
          lng: -112,
          region: 'UT',
          isPartiallyVisited: true,
          visited: true,
          visitedBy: [],
        },
        { id: 'p3', name: 'P3', lat: 37, lng: -112, region: 'UT', visited: false, visitedBy: [] },
      ];
      const summary = calculateStatusSummary(items);
      expect(summary.visitedCount).toBe(1);
      expect(summary.partialCount).toBe(1);
      expect(summary.unvisitedCount).toBe(1);
      expect(summary.total).toBe(3);
    });
  });

  describe('resolveStackedCardColors', () => {
    it('returns visited primary and layered colors when all 3 statuses are present', () => {
      const summary = { visitedCount: 2, partialCount: 1, unvisitedCount: 1, total: 4 };
      const colors = resolveStackedCardColors(summary, theme);
      expect(colors.primaryColor).toBe(theme.markerVisitedColor);
      expect(colors.secondaryColors[0]).toBe(theme.markerPartialColor);
      expect(colors.secondaryColors[1]).toBe(theme.markerUnvisitedColor);
    });

    it('handles mixed visited and unvisited without partial', () => {
      const summary = { visitedCount: 2, partialCount: 0, unvisitedCount: 1, total: 3 };
      const colors = resolveStackedCardColors(summary, theme);
      expect(colors.primaryColor).toBe(theme.markerVisitedColor);
      expect(colors.secondaryColors[0]).toBe(theme.markerUnvisitedColor);
      expect(colors.secondaryColors[1]).toBe(theme.markerVisitedColor);
    });

    it('handles pure unvisited cluster', () => {
      const summary = { visitedCount: 0, partialCount: 0, unvisitedCount: 3, total: 3 };
      const colors = resolveStackedCardColors(summary, theme);
      expect(colors.primaryColor).toBe(theme.markerUnvisitedColor);
      expect(colors.secondaryColors[0]).toBe(theme.markerUnvisitedColor);
      expect(colors.secondaryColors[1]).toBe(theme.markerUnvisitedColor);
    });
  });

  describe('groupMarkersIntoClusters', () => {
    it('returns empty array when locations are empty', () => {
      const clusters = groupMarkersIntoClusters([], undefined, theme);
      expect(clusters).toEqual([]);
    });

    it('returns separate individual 1-item clusters when map is not supplied', () => {
      const items: EnrichedLocationPoint[] = [
        {
          id: 'park-1',
          name: 'Park 1',
          lat: 37,
          lng: -112,
          region: 'UT',
          visited: true,
          visitedBy: [],
        },
        {
          id: 'park-2',
          name: 'Park 2',
          lat: 37.1,
          lng: -112.1,
          region: 'UT',
          visited: false,
          visitedBy: [],
        },
      ];
      const clusters = groupMarkersIntoClusters(items, undefined, theme);
      expect(clusters.length).toBe(2);
      expect(clusters[0].items.length).toBe(1);
      expect(clusters[1].items.length).toBe(1);
    });

    it('clusters nearby points in pixel space when map is provided', () => {
      // Mock Leaflet Map with latLngToLayerPoint
      const mockMap = {
        getZoom: () => 6,
        latLngToLayerPoint: (latlng: [number, number]) => {
          // Park 1 and Park 2 are within 10px; Park 3 is 200px away
          if (latlng[0] === 37.0) return L.point(100, 100);
          if (latlng[0] === 37.1) return L.point(108, 106);
          return L.point(400, 400);
        },
      } as unknown as L.Map;

      const items: EnrichedLocationPoint[] = [
        {
          id: 'park-zion',
          name: 'Zion',
          lat: 37.0,
          lng: -113.0,
          region: 'UT',
          visited: true,
          isAllVisited: true,
          visitedBy: [],
        },
        {
          id: 'park-bryce',
          name: 'Bryce',
          lat: 37.1,
          lng: -112.1,
          region: 'UT',
          visited: true,
          isPartiallyVisited: true,
          visitedBy: [],
        },
        {
          id: 'park-yellowstone',
          name: 'Yellowstone',
          lat: 44.4,
          lng: -110.5,
          region: 'WY',
          visited: false,
          visitedBy: [],
        },
      ];

      const clusters = groupMarkersIntoClusters(items, mockMap, theme, 28, 11);
      expect(clusters.length).toBe(2);

      const multiCluster = clusters.find((c) => c.items.length === 2);
      expect(multiCluster).toBeDefined();
      expect(multiCluster?.items.map((i) => i.id)).toEqual(['park-zion', 'park-bryce']);
      expect(multiCluster?.lat).toBeCloseTo(37.05);
      expect(multiCluster?.isParkCluster).toBe(true);

      const singleCluster = clusters.find((c) => c.items.length === 1);
      expect(singleCluster?.items[0].id).toBe('park-yellowstone');
    });

    it('never clusters hometowns even if adjacent in pixels', () => {
      const mockMap = {
        getZoom: () => 6,
        latLngToLayerPoint: () => L.point(100, 100),
      } as unknown as L.Map;

      const items: EnrichedLocationPoint[] = [
        {
          id: 'hometown-1',
          name: 'Home 1',
          lat: 40.0,
          lng: -111.0,
          region: 'UT',
          visited: true,
          visitedBy: [],
        },
        {
          id: 'hometown-2',
          name: 'Home 2',
          lat: 40.01,
          lng: -111.01,
          region: 'UT',
          visited: true,
          visitedBy: [],
        },
      ];

      const clusters = groupMarkersIntoClusters(items, mockMap, theme, 28, 11);
      expect(clusters.length).toBe(2);
      expect(clusters[0].items.length).toBe(1);
      expect(clusters[1].items.length).toBe(1);
    });
  });
});
