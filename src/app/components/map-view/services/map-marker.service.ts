// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { ColorThemeDefinition } from '../../../core/constants/theme.constants';
import { MAP_MARKER_THEME } from '../../../core/constants/map.constants';
import { LocationPoint } from '../../../models/location.model';
import { FamilyMember } from '../../../models/settings.model';
import { buildLocationPopupHtml } from '../utils/map-popup.util';

export interface RenderMarkersOptions {
  layerGroup: L.LayerGroup;
  locations: LocationPoint[];
  searchTerm: string;
  mapMode: 'parks' | 'states' | 'roads';
  currentTheme: ColorThemeDefinition;
  familyMembers: FamilyMember[];
}

@Injectable({
  providedIn: 'root',
})
export class MapMarkerService {
  /**
   * Clears and renders filtered markers onto the map layer group.
   */
  public renderMarkers(options: RenderMarkersOptions): void {
    const { layerGroup, locations, searchTerm, mapMode, currentTheme, familyMembers } = options;

    if (!layerGroup) return;

    layerGroup.clearLayers();

    const lowerTerm = (searchTerm || '').toLowerCase();
    const filtered = (locations || []).filter((m) => {
      // Always show hometowns
      if (m.id.startsWith('hometown-')) {
        return m.name.toLowerCase().includes(lowerTerm);
      }

      // Filter by map mode
      if (mapMode === 'roads') return false;
      if (mapMode === 'parks' && !m.id.includes('park')) return false;
      if (mapMode === 'states' && !m.id.includes('state')) return false;

      return m.name.toLowerCase().includes(lowerTerm);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered.forEach((m: any) => {
      if (m.lat === 0 && m.lng === 0) return; // Skip if no coordinates

      const isPark = m.id.includes('park');
      const markerTheme = isPark ? MAP_MARKER_THEME.PARK : MAP_MARKER_THEME.STATE;

      let bgColor: string;
      let border: string;
      let boxShadow: string;
      let opacity: number;
      let zIndexOffset: number;

      if (isPark) {
        bgColor = MAP_MARKER_THEME.PARK.BG_COLOR;
        if (m.isAllVisited || (m.visited && !m.isPartiallyVisited)) {
          border = `2.5px solid ${currentTheme.markerVisitedColor || '#22c55e'}`;
          boxShadow = '0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.8)';
          opacity = 1;
          zIndexOffset = 500;
        } else if (m.isPartiallyVisited) {
          border = `2.5px solid ${currentTheme.markerPartialColor || '#f59e0b'}`;
          boxShadow = '0 2px 5px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.8)';
          opacity = 1;
          zIndexOffset = 400;
        } else {
          border = '1.5px solid #94a3b8';
          boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
          opacity = 0.85;
          zIndexOffset = 0;
        }
      } else {
        if (m.isAllVisited || (m.visited && !m.isPartiallyVisited)) {
          bgColor = currentTheme.markerVisitedColor;
          border = markerTheme.BORDER_ALL;
          boxShadow = markerTheme.BOX_SHADOW_ALL;
          opacity = 1;
          zIndexOffset = 500;
        } else if (m.isPartiallyVisited) {
          bgColor = currentTheme.markerPartialColor;
          border = markerTheme.BORDER_SOME;
          boxShadow = markerTheme.BOX_SHADOW_SOME;
          opacity = 1;
          zIndexOffset = 400;
        } else {
          bgColor = currentTheme.markerUnvisitedColor;
          border = markerTheme.BORDER_NONE;
          boxShadow = markerTheme.BOX_SHADOW_NONE;
          opacity = 0.72;
          zIndexOffset = 0;
        }
      }

      let popupHtml = '';
      if (m.id.startsWith('hometown-')) {
        popupHtml = `<strong>${m.name} (${m.isLast ? 'Hometown' : 'Previous Hometown'})</strong>`;
      } else {
        const originalId = m.id.replace('park-', '').replace('state-', '');
        popupHtml = buildLocationPopupHtml(
          {
            name: m.name,
            isPark,
            originalId,
            visitedByMembers: m.visitedByMembers,
            visitLogs: m.visitLogs,
          },
          familyMembers,
        );
      }

      if (m.id.startsWith('hometown-')) {
        const htColor = m.isLast
          ? MAP_MARKER_THEME.HOMETOWN.ACTIVE_COLOR
          : MAP_MARKER_THEME.HOMETOWN.PREVIOUS_COLOR;
        const iconHtml = `<div class="flex items-center justify-center transition-all duration-300" style="width:${MAP_MARKER_THEME.HOMETOWN.DIAMETER}px; height:${MAP_MARKER_THEME.HOMETOWN.DIAMETER}px; background-color:${htColor}; border-radius:50%; border: ${MAP_MARKER_THEME.HOMETOWN.BORDER}; box-shadow: ${MAP_MARKER_THEME.HOMETOWN.BOX_SHADOW}; font-size:${MAP_MARKER_THEME.HOMETOWN.FONT_SIZE};">${MAP_MARKER_THEME.HOMETOWN.ICON_CHAR}</div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [MAP_MARKER_THEME.HOMETOWN.DIAMETER, MAP_MARKER_THEME.HOMETOWN.DIAMETER],
          iconAnchor: [MAP_MARKER_THEME.HOMETOWN.ANCHOR, MAP_MARKER_THEME.HOMETOWN.ANCHOR],
          popupAnchor: [0, MAP_MARKER_THEME.HOMETOWN.POPUP_OFFSET_Y],
        });

        L.marker([m.lat, m.lng], { icon, zIndexOffset: m.isLast ? 1000 : 800 })
          .bindPopup(`<strong>${m.name} (${m.isLast ? 'Hometown' : 'Previous Hometown'})</strong>`)
          .addTo(layerGroup);
      } else {
        const iconChar = isPark
          ? m.country === 'Canada'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (markerTheme as any).ICON_CHAR_CA || '🏔️'
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (markerTheme as any).ICON_CHAR_US || '⛰️'
          : m.country === 'Canada' || m.sub === 'Canada'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (markerTheme as any).ICON_CHAR_CA || '🇨🇦'
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (markerTheme as any).ICON_CHAR_US || '🇺🇸';
        const iconHtml = `<div class="flex items-center justify-center transition-all duration-300" style="width:${markerTheme.DIAMETER}px; height:${markerTheme.DIAMETER}px; background-color:${bgColor}; border-radius:50%; border: ${border}; box-shadow: ${boxShadow}; opacity: ${opacity}; font-size:${markerTheme.FONT_SIZE}; line-height: 1;">${iconChar}</div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [markerTheme.DIAMETER, markerTheme.DIAMETER],
          iconAnchor: [markerTheme.ANCHOR, markerTheme.ANCHOR],
          popupAnchor: [0, -markerTheme.ANCHOR],
        });
        L.marker([m.lat, m.lng], { icon, zIndexOffset }).bindPopup(popupHtml).addTo(layerGroup);
      }
    });
  }
}
