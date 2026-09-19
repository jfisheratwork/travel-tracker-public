import { describe, it, expect } from 'vitest';
import { reduceCoordinates } from './geo.utils';

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
});
