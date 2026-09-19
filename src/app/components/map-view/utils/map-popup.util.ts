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
  originalId: string;
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
  const subLabel = params.isPark ? 'National Park' : 'State / Province';
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

  return `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; min-width: 240px; padding: 4px;">
      <strong style="font-size: 14px; display: block; color: #292524;">${escapeHtml(params.name)}</strong>
      <span style="font-size: 12px; color: #78716c; display: block; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; margin-bottom: 4px;">${escapeHtml(subLabel)}</span>
      
      ${visitLogsBadge}

      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; margin-bottom: 8px;">
        ${membersHtml}
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
