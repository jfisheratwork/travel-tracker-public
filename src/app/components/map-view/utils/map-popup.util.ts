import { FamilyMember } from '../../../models/settings.model';
import { escapeHtml } from '../../../core/utils/security.utils';

export interface LocationPopupMemberVisit {
  id: string;
  date?: string;
  name?: string;
  color?: string;
  notes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface LocationPopupParams {
  name: string;
  isPark: boolean;
  isCountryCapital?: boolean;
  originalId: string;
  visited?: boolean;
  wantToVisit?: boolean;
  visitedByMembers?: LocationPopupMemberVisit[];
  visitLogs?: unknown[];
}

/**
 * Builds the HTML markup for a Leaflet location marker popup.
 *
 * @param params Details of the location and visit logs
 * @param familyMembers Current family members list from settings
 * @returns HTML string for the Leaflet popup
 */
export function buildLocationPopupHtml(
  params: LocationPopupParams,
  familyMembers: FamilyMember[],
): string {
  const subLabel = params.isPark
    ? 'National Park'
    : params.isCountryCapital
      ? 'Country Capital'
      : 'State / Province';
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(params.name).replace(/%20/g, '_')}`;

  const membersHtml = (familyMembers || [])
    .map((member: FamilyMember) => {
      const hasVisited = params.visitedByMembers?.some((v) => v.id === member.id);
      let visitText = 'No';

      if (hasVisited) {
        const visitObj = params.visitedByMembers?.find((v) => v.id === member.id);
        visitText = visitObj?.date ? `Yes (${visitObj.date})` : 'Yes';
      }

      return `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#57534e;">${escapeHtml(member.name)}</span>
          <span style="color:${hasVisited ? '#16a34a' : '#d6d3d1'}; font-weight:${hasVisited ? 'bold' : 'normal'}; font-size:12px;">${escapeHtml(visitText)}</span>
        </div>
      `;
    })
    .join('');

  const visitLogsBadge =
    params.visitLogs && params.visitLogs.length > 0
      ? `<div style="font-size: 11px; color: #2563eb; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 3px 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
           <span>📅</span>
           <strong>${params.visitLogs.length} trip visit${params.visitLogs.length > 1 ? 's' : ''} logged</strong>
         </div>`
      : '';

  const isVisited = !!params.visited;
  const isWant = !isVisited && !!params.wantToVisit;
  const isUnvisited = !isVisited && !isWant;

  return `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; min-width: 240px; padding: 4px;">
      <strong style="font-size: 14px; display: block; color: #292524;">${escapeHtml(params.name)}</strong>
      <span style="font-size: 12px; color: #78716c; display: block; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; margin-bottom: 4px;">${escapeHtml(subLabel)}</span>
      
      ${visitLogsBadge}

      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; margin-bottom: 8px;">
        ${membersHtml}
      </div>

      <!-- Quick 1A Tri-State Status Pill -->
      <div style="margin-top: 6px; padding: 2px; background: #f5f5f4; border-radius: 8px; border: 1px solid #e7e5e4; display: flex; gap: 2px; font-size: 11px;">
        <button class="status-toggle-btn" data-id="${params.originalId}" data-mode="${params.isPark ? 'parks' : 'states'}" data-status="visited" style="flex: 1; text-align: center; padding: 3px 4px; border-radius: 6px; font-weight: ${isVisited ? 'bold' : 'normal'}; background: ${isVisited ? '#16a34a' : 'transparent'}; color: ${isVisited ? '#ffffff' : '#57534e'}; border: none; cursor: pointer;" title="Mark Visited">
          🌲 Visited
        </button>
        <button class="status-toggle-btn" data-id="${params.originalId}" data-mode="${params.isPark ? 'parks' : 'states'}" data-status="want" style="flex: 1; text-align: center; padding: 3px 4px; border-radius: 6px; font-weight: ${isWant ? 'bold' : 'normal'}; background: ${isWant ? '#9333ea' : 'transparent'}; color: ${isWant ? '#ffffff' : '#57534e'}; border: none; cursor: pointer;" title="Mark Want to Visit">
          💜 Want
        </button>
        <button class="status-toggle-btn" data-id="${params.originalId}" data-mode="${params.isPark ? 'parks' : 'states'}" data-status="unvisited" style="flex: 1; text-align: center; padding: 3px 4px; border-radius: 6px; font-weight: ${isUnvisited ? 'bold' : 'normal'}; background: ${isUnvisited ? '#d6d3d1' : 'transparent'}; color: ${isUnvisited ? '#292524' : '#78716c'}; border: none; cursor: pointer;" title="Clear status">
          ⚪ Clear
        </button>
      </div>

      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f5f5f4; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <a href="${wikiUrl}" target="_blank" style="font-size: 12px; color: #3b82f6; text-decoration: none; display: flex; align-items: center; gap: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line></svg>
          Wikipedia
        </a>
        <button class="edit-location-btn" data-id="${params.originalId}" data-mode="${params.isPark ? 'parks' : 'states'}" style="font-size: 11px; color: #15803d; font-weight: bold; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          ✏️ Details
        </button>
      </div>
    </div>
  `;
}

export interface ClusterPopupClusterInfo {
  items: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    isAllVisited?: boolean;
    isPartiallyVisited?: boolean;
    wantToVisit?: boolean;
    isWantToVisit?: boolean;
    visited?: boolean;
    visitedByMembers?: Array<{
      id: string;
      name?: string;
      color?: string;
      date?: string;
      notes?: string;
      [key: string]: unknown;
    }>;
    visitLogs?: unknown[];
    isCountryCapital?: boolean;
    country?: string;
    sub?: string;
  }>;
  bounds: [[number, number], [number, number]];
  statusSummary: {
    visitedCount: number;
    partialCount: number;
    unvisitedCount: number;
    total: number;
  };
  isParkCluster: boolean;
}

/**
 * Builds the rich multi-item inspection HTML markup for an overlapping marker cluster.
 *
 * @param cluster The cluster group data containing locations and bounds
 * @param familyMembers Current family members list
 * @returns HTML string for the Leaflet popup
 */
export function buildClusterPopupHtml(
  cluster: ClusterPopupClusterInfo,
  familyMembers: FamilyMember[],
): string {
  const { items, bounds, statusSummary, isParkCluster } = cluster;
  const count = items.length;

  const clusterTitle = isParkCluster ? 'National Parks Cluster' : 'Locations Cluster';
  const boundsJson = escapeHtml(JSON.stringify(bounds));

  const itemsHtml = items
    .map((item) => {
      const isPark = item.id.includes('park');
      const originalId = item.id.replace('park-', '').replace('state-', '');
      const isVisited = item.isAllVisited || (item.visited && !item.isPartiallyVisited);
      const isPartial = item.isPartiallyVisited;
      const isWant = Boolean(item.wantToVisit || item.isWantToVisit);

      let statusColor = '#64748b';
      let chipHtml =
        '<span style="font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; background: #f1f5f9; color: #64748b; white-space: nowrap;">Not yet</span>';
      let metaText = 'Not visited yet';

      if (isVisited) {
        statusColor = '#22c55e';
        chipHtml =
          '<span style="font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; background: #dcfce7; color: #15803d; white-space: nowrap;">Everyone</span>';
        metaText = 'Visited by Everyone';
      } else if (isPartial) {
        statusColor = '#f59e0b';
        chipHtml =
          '<span style="font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; background: #fef3c7; color: #b45309; white-space: nowrap;">Some of us</span>';
        const visitorNames = (item.visitedByMembers || [])
          .map((v) => {
            const mem = familyMembers.find((m) => m.id === v.id);
            return mem ? mem.name : v.name || 'Member';
          })
          .slice(0, 2)
          .join(', ');
        metaText = `Visited by ${visitorNames || 'Some members'}`;
      } else if (isWant) {
        statusColor = '#8b5cf6';
        chipHtml =
          '<span style="font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; background: #f5f3ff; color: #6d28d9; white-space: nowrap;">⭐ Want to visit</span>';
        metaText = 'On Wishlist';
      }

      const iconSymbol = isPark ? '⛰️' : '🏛️';

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: ${statusColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">
              ${iconSymbol}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 12px; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(item.name)}
              </div>
              <div style="font-size: 10.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(metaText)}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            ${chipHtml}
            <button class="edit-location-btn" data-id="${escapeHtml(originalId)}" data-mode="${isPark ? 'parks' : 'states'}" style="font-size: 10px; color: #15803d; font-weight: bold; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 5px; border-radius: 4px; cursor: pointer; display: flex; align-items: center;" title="Edit details">
              ✏️
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; min-width: 270px; max-width: 320px; padding: 2px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
        <strong style="font-size: 13px; color: #0f172a; display: flex; align-items: center; gap: 4px;">
          <span>📍</span> ${escapeHtml(clusterTitle)}
        </strong>
        <span style="font-size: 10.5px; font-weight: 700; background: #0f172a; color: #38bdf8; border: 1px solid #38bdf8; border-radius: 9999px; padding: 1px 7px;">
          ${count} Locations
        </span>
      </div>

      <!-- Breakdown summary -->
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; line-height: 1.3;">
        ${statusSummary.visitedCount} visited · ${statusSummary.partialCount} partial · ${statusSummary.unvisitedCount} unvisited
      </div>

      <!-- Scrollable list of items -->
      <div style="display: flex; flex-direction: column; gap: 5px; max-height: 220px; overflow-y: auto; margin-bottom: 8px; padding-right: 2px;">
        ${itemsHtml}
      </div>

      <!-- Footer action: Zoom In to Separate -->
      <div style="padding-top: 6px; border-top: 1px solid #f1f5f9;">
        <button class="zoom-cluster-btn" data-bounds="${boundsJson}" style="width: 100%; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          <span>🔍</span>
          <span>Zoom In to Separate</span>
        </button>
      </div>
    </div>
  `;
}
