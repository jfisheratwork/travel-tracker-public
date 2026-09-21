import { describe, it, expect } from 'vitest';
import { GLOBAL_COUNTRIES, COUNTRIES_MAP } from './countries.constants';
import { REGIONS, REGIONS_MAP, getRegionsByCountry } from './regions.constants';
import {
  CURATED_NATIONAL_PARKS,
  CROWN_JEWELS_STATE_PARKS,
  CURATED_CITIES,
  STATIC_PLACES_CATALOG,
  STATIC_PLACES_MAP,
  getStaticPlace,
} from './curated-places.constants';

describe('V4 Geography & Curated Places Catalogs', () => {
  describe('GLOBAL_COUNTRIES', () => {
    it('should have USA and Canada permanently pinned at top', () => {
      expect(GLOBAL_COUNTRIES.length).toBeGreaterThan(150);
      expect(GLOBAL_COUNTRIES[0]).toEqual({
        id: 'US',
        code: 'US',
        name: 'United States',
        pinned: true,
      });
      expect(GLOBAL_COUNTRIES[1]).toEqual({
        id: 'CA',
        code: 'CA',
        name: 'Canada',
        pinned: true,
      });
    });

    it('should index countries in COUNTRIES_MAP for O(1) retrieval', () => {
      const us = COUNTRIES_MAP.get('US');
      expect(us?.name).toBe('United States');
      const ca = COUNTRIES_MAP.get('CA');
      expect(ca?.name).toBe('Canada');
    });
  });

  describe('REGIONS', () => {
    it('should contain all US states and Canadian provinces with valid compound IDs', () => {
      expect(REGIONS.length).toBeGreaterThanOrEqual(60);

      const usRegions = getRegionsByCountry('US');
      expect(usRegions.length).toBeGreaterThanOrEqual(51); // 50 states + DC + territories
      expect(REGIONS_MAP.get('US-CA')?.name).toBe('California');
      expect(REGIONS_MAP.get('US-NY')?.name).toBe('New York');

      const caRegions = getRegionsByCountry('CA');
      expect(caRegions.length).toBe(13); // 10 provinces + 3 territories
      expect(REGIONS_MAP.get('CA-AB')?.name).toBe('Alberta');
      expect(REGIONS_MAP.get('CA-ON')?.name).toBe('Ontario');
    });
  });

  describe('Curated Datasets & STATIC_PLACES_CATALOG', () => {
    it('should contain curated national parks, crown jewel state parks, and key cities', () => {
      expect(CURATED_NATIONAL_PARKS.length).toBeGreaterThanOrEqual(60);
      expect(CROWN_JEWELS_STATE_PARKS.length).toBeGreaterThanOrEqual(25);
      expect(CURATED_CITIES.length).toBeGreaterThanOrEqual(60);

      expect(STATIC_PLACES_CATALOG.length).toBe(
        CURATED_NATIONAL_PARKS.length + CROWN_JEWELS_STATE_PARKS.length + CURATED_CITIES.length,
      );
    });

    it('should have valid coordinates and non-empty metadata for all catalog entries', () => {
      for (const place of STATIC_PLACES_CATALOG) {
        expect(place.id).toBeTruthy();
        expect(place.name).toBeTruthy();
        expect(place.category).toBeTruthy();
        expect(place.countryId).toBeTruthy();
        expect(place.source).toBe('static');
        expect(place.isCurated).toBe(true);

        // Coordinate bounds
        expect(place.lat).toBeGreaterThanOrEqual(-90);
        expect(place.lat).toBeLessThanOrEqual(90);
        expect(place.lng).toBeGreaterThanOrEqual(-180);
        expect(place.lng).toBeLessThanOrEqual(180);
      }
    });

    it('should accurately resolve places by ID or canonical name in O(1) time', () => {
      // National Park lookup by slug ID
      const yosemite = getStaticPlace('np-yosemite');
      expect(yosemite).toBeDefined();
      expect(yosemite?.category).toBe('national_park');
      expect(yosemite?.regionId).toBe('US-CA');

      // National Park lookup by legacy name key
      const yosemiteByName = getStaticPlace('Yosemite National Park');
      expect(yosemiteByName).toBeDefined();

      // Crown Jewel State Park lookup
      const custer = getStaticPlace('sp-custer');
      expect(custer).toBeDefined();
      expect(custer?.name).toBe('Custer State Park');
      expect(custer?.regionId).toBe('US-SD');

      // Curated City lookup with flags
      const dc = getStaticPlace('city-washington-dc');
      expect(dc).toBeDefined();
      expect(dc?.isCapital).toBe(true);
      expect(dc?.isMajorCity).toBe(true);
      expect(dc?.regionId).toBe('US-DC');

      const chicago = getStaticPlace('city-chicago');
      expect(chicago).toBeDefined();
      expect(chicago?.isMajorCity).toBe(true);
      expect(chicago?.regionId).toBe('US-IL');

      const toronto = getStaticPlace('city-toronto');
      expect(toronto).toBeDefined();
      expect(toronto?.countryId).toBe('CA');
      expect(toronto?.regionId).toBe('CA-ON');
    });

    it('should perform 10,000 lookups efficiently in under 50ms benchmark', () => {
      const sampleKeys = [
        'np-yellowstone',
        'np-yosemite',
        'sp-custer',
        'sp-starved-rock',
        'city-chicago',
        'city-new-york',
        'city-london',
        'city-toronto',
        'city-washington-dc',
        'sp-adirondack',
      ];

      let foundCount = 0;
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        const key = sampleKeys[i % sampleKeys.length];
        const res = STATIC_PLACES_MAP.get(key);
        if (res) foundCount++;
      }
      const elapsed = performance.now() - start;
      expect(foundCount).toBe(10000);
      expect(elapsed).toBeLessThan(50);
    });
  });
});
