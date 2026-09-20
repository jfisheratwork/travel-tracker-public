import { describe, it, expect } from 'vitest';
import { buildLocationPopupHtml, buildClusterPopupHtml } from './map-popup.util';
import { FamilyMember } from '../../../models/settings.model';

describe('map-popup.util', () => {
  const familyMembers: FamilyMember[] = [
    { id: '1', name: 'Alice', color: '#ff0000' },
    { id: '2', name: 'Bob', color: '#00ff00' },
  ];

  it('should build popup HTML for a national park', () => {
    const html = buildLocationPopupHtml(
      {
        name: 'Yosemite',
        isPark: true,
        originalId: 'yosemite-np',
        visitedByMembers: [{ id: '1', date: '2023-05-10' }],
      },
      familyMembers,
    );

    expect(html).toContain('Yosemite');
    expect(html).toContain('National Park');
    expect(html).toContain('Alice');
    expect(html).toContain('Yes (2023-05-10)');
    expect(html).toContain('Bob');
    expect(html).toContain('No');
    expect(html).toContain('Wikipedia');
    expect(html).toContain('data-id="yosemite-np"');
    expect(html).toContain('data-mode="parks"');
  });

  it('should include trip visit log badge when visitLogs are provided', () => {
    const html = buildLocationPopupHtml(
      {
        name: 'California',
        isPark: false,
        originalId: 'CA',
        visitLogs: [{ id: 'log1' }, { id: 'log2' }],
      },
      familyMembers,
    );

    expect(html).toContain('State / Province');
    expect(html).toContain('2 trip visits logged');
    expect(html).toContain('data-mode="states"');
  });

  it('should build multi-item cluster popup HTML with zoom button and individual item edit buttons', () => {
    const cluster = {
      items: [
        {
          id: 'park-zion',
          name: 'Zion National Park',
          lat: 37.2,
          lng: -112.9,
          isAllVisited: true,
          visited: true,
          visitedByMembers: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        },
        {
          id: 'park-bryce',
          name: 'Bryce Canyon',
          lat: 37.5,
          lng: -112.1,
          isPartiallyVisited: true,
          visited: true,
          visitedByMembers: [{ id: '1', name: 'Alice' }],
        },
        {
          id: 'park-capitol',
          name: 'Capitol Reef',
          lat: 38.2,
          lng: -111.1,
          visited: false,
        },
      ],
      bounds: [
        [37.2, -112.9],
        [38.2, -111.1],
      ] as [[number, number], [number, number]],
      statusSummary: {
        visitedCount: 1,
        partialCount: 1,
        unvisitedCount: 1,
        total: 3,
      },
      isParkCluster: true,
    };

    const html = buildClusterPopupHtml(cluster, familyMembers);

    expect(html).toContain('National Parks Cluster');
    expect(html).toContain('3 Locations');
    expect(html).toContain('1 visited · 1 partial · 1 unvisited');
    expect(html).toContain('Zion National Park');
    expect(html).toContain('Everyone');
    expect(html).toContain('Bryce Canyon');
    expect(html).toContain('Some of us');
    expect(html).toContain('Capitol Reef');
    expect(html).toContain('Not yet');
    expect(html).toContain('data-id="zion"');
    expect(html).toContain('data-id="bryce"');
    expect(html).toContain('data-id="capitol"');
    expect(html).toContain('zoom-cluster-btn');
    expect(html).toContain('Zoom In to Separate');
  });
});
