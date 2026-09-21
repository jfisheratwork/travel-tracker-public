import { describe, it, expect } from 'vitest';
import {
  reduceCoordinates,
  haversineDistanceMiles,
  distanceToPolylineMiles,
  findPlacesInCorridor,
} from './geo.utils';

describe('geo.utils - reduceCoordinates', () => {
  it('should return original array if length <= 2', () => {
    const route: [number, number][] = [
      [10, 20],
      [11, 21],
    ];
    expect(reduceCoordinates(route, 0.5)).toEqual(route);
  });

  it('should return original array if reduction factor is >= 1 or <= 0', () => {
    const route: [number, number][] = [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ];
    expect(reduceCoordinates(route, 1)).toEqual(route);
    expect(reduceCoordinates(route, 0)).toEqual(route);
  });

  it('should decimate points based on reduction factor while keeping last point', () => {
    const route: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ];
    const reduced = reduceCoordinates(route, 0.5);
    // step is ceil(1/0.5) = 2. Indices taken: 0, 2, 4, then last point 5
    expect(reduced).toEqual([
      [0, 0],
      [2, 2],
      [4, 4],
      [5, 5],
    ]);
  });

  it('should calculate Haversine distance correctly between NYC and LA', () => {
    // NYC approx 40.7128, -74.0060; LA approx 34.0522, -118.2437 (~2,446 miles)
    const dist = haversineDistanceMiles(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(2400);
    expect(dist).toBeLessThan(2500);
  });

  it('should calculate distance from point to polyline', () => {
    // Segment from (0, 0) to (0, 10) along equator
    const polyline: [number, number][] = [
      [0, 0],
      [0, 10],
    ];
    // Point at (1, 5) -> ~1 degree north of midpoint -> ~69 miles
    const dist = distanceToPolylineMiles([1, 5], polyline);
    expect(dist).toBeGreaterThan(65);
    expect(dist).toBeLessThan(75);
  });

  it('should find places within route corridor buffer and sort by distance', () => {
    const route: [number, number][] = [
      [37.7749, -122.4194], // San Francisco
      [38.5816, -121.4944], // Sacramento (~88 miles northeast)
    ];

    const places = [
      { id: 'near-davis', name: 'Davis', lat: 38.5449, lng: -121.7405 }, // On the I-80 corridor (<5 miles)
      { id: 'far-seattle', name: 'Seattle', lat: 47.6062, lng: -122.3321 }, // Far away (~800 miles)
      { id: 'near-napa', name: 'Napa', lat: 38.2975, lng: -122.2869 }, // ~20 miles off route
    ];

    const matches = findPlacesInCorridor(route, places, 50);
    expect(matches.length).toBe(2);
    expect(matches[0].place.id).toBe('near-davis');
    expect(matches[0].distanceMiles).toBeLessThan(10);
    expect(matches[1].place.id).toBe('near-napa');
    expect(matches[1].distanceMiles).toBeLessThan(35);
  });
});
