import { describe, it, expect } from 'vitest';
import { buildLocationPopupHtml } from './map-popup.util';
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
});
