// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { ColorThemeDefinition } from '../../../core/constants/theme.constants';
import {
  MAP_THEME,
  MAP_MARKER_THEME,
  WANT_TO_VISIT_STAR_PIP_HTML,
} from '../../../core/constants/map.constants';
import { LocationPoint, MapMode } from '../../../models/location.model';
import { FamilyMember } from '../../../models/settings.model';
import { buildLocationPopupHtml, buildClusterPopupHtml } from '../utils/map-popup.util';
import { groupMarkersIntoClusters } from '../utils/map-cluster.util';

import { PlaceFilterCategory } from '../../../services/state.service';

export interface RenderMarkersOptions {
  layerGroup: L.LayerGroup;
  locations: LocationPoint[];
  searchTerm: string;
  mapMode: MapMode;
  currentTheme: ColorThemeDefinition;
  familyMembers: FamilyMember[];
  placesFilters?: PlaceFilterCategory[];
  map?: L.Map;
}

@Injectable({
  providedIn: 'root',
})
export class MapMarkerService {
  /**
   * Clears and renders filtered markers onto the map layer group.
   */
  public renderMarkers(options: RenderMarkersOptions): void {
    const {
      layerGroup,
      locations,
      searchTerm,
      mapMode,
      currentTheme,
      familyMembers,
      placesFilters,
    } = options;

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

      // Filter by placesFilters if provided
      if (placesFilters && placesFilters.length >= 0) {
        let cat: PlaceFilterCategory;
        if (m.category === 'state' || m.id.startsWith('state-')) {
          cat = 'states';
        } else if (
          m.category === 'national_park' ||
          m.id.startsWith('park-') ||
          m.id.startsWith('np-')
        ) {
          cat = 'national_parks';
        } else if (m.category === 'state_park' || m.id.startsWith('sp-')) {
          cat = 'state_parks';
        } else if (m.category === 'landmark' || m.id.startsWith('lm-')) {
          cat = 'landmarks';
        } else if (m.category === 'theme_park' || m.id.startsWith('tp-')) {
          cat = 'theme_parks';
        } else if (m.category === 'city' || m.id.startsWith('city-')) {
          cat = 'cities';
        } else {
          cat = 'custom';
        }

        if (!placesFilters.includes(cat)) {
          return false;
        }
      }

      return m.name.toLowerCase().includes(lowerTerm);
    });

    const clusters = groupMarkersIntoClusters(filtered, options.map, currentTheme);

    clusters.forEach((cluster) => {
      // If multi-item cluster: Render Option 1: Stacked Card Depth
      if (cluster.items.length > 1) {
        let iconChar: string;
        if (cluster.isParkCluster) {
          iconChar = cluster.isCanadaCluster
            ? MAP_MARKER_THEME.PARK.ICON_CHAR_CA
            : MAP_MARKER_THEME.PARK.ICON_CHAR_US;
        } else {
          iconChar = cluster.isCanadaCluster
            ? MAP_MARKER_THEME.STATE.ICON_CHAR_CA
            : MAP_MARKER_THEME.STATE.ICON_CHAR_US;
        }

        const textColor = '#ffffff';
        const zIndexOffset = 600 + (cluster.statusSummary.visitedCount > 0 ? 50 : 0);

        const iconHtml = `
          <div class="cluster-stacked-marker" style="position: relative; width: 30px; height: 30px; cursor: pointer; filter: drop-shadow(0 2.5px 5px rgba(0,0,0,0.38));">
            <div style="position: absolute; top: -3.5px; left: 3.5px; width: 26px; height: 26px; border-radius: 50%; background-color: ${cluster.secondaryColors[1]}; border: 1.5px solid #ffffff; opacity: 0.85;"></div>
            <div style="position: absolute; top: -1.5px; left: 1.5px; width: 28px; height: 28px; border-radius: 50%; background-color: ${cluster.secondaryColors[0]}; border: 1.5px solid #ffffff;"></div>
            <div style="position: absolute; top: 0; left: 0; width: 30px; height: 30px; border-radius: 50%; background-color: ${cluster.primaryColor}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; color: ${textColor}; font-size: 13px; line-height: 1; z-index: 2;">
              ${iconChar}
            </div>
            <div style="position: absolute; top: -7px; right: -7px; background: #0f172a; color: #38bdf8; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9999px; border: 1.5px solid #38bdf8; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 5;">
              ${cluster.items.length}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
        });

        const popupHtml = buildClusterPopupHtml(cluster, familyMembers);
        L.marker([cluster.lat, cluster.lng], { icon, zIndexOffset })
          .bindPopup(popupHtml)
          .addTo(layerGroup);
        return;
      }

      // Single item marker rendering
      const m = cluster.items[0];
      if (m.lat === 0 && m.lng === 0) return; // Skip if no coordinates

      const isPark = m.id.includes('park');
      const markerTheme = isPark ? MAP_MARKER_THEME.PARK : MAP_MARKER_THEME.STATE;
      const isWantToVisit = Boolean(
        m.wantToVisit ||
        m.isWantToVisit ||
        (m as { status?: string }).status === 'want' ||
        (m as { status?: string }).status === 'wantToVisit',
      );

      let bgColor: string;
      let border: string;
      let boxShadow: string;
      let opacity: number;
      let zIndexOffset: number;
      let textColor: string;

      if (isPark) {
        if (m.isAllVisited || (m.visited && !m.isPartiallyVisited)) {
          bgColor = currentTheme.markerVisitedColor || '#22c55e';
          border = MAP_MARKER_THEME.PARK.BORDER_ALL;
          boxShadow = MAP_MARKER_THEME.PARK.BOX_SHADOW_ALL;
          opacity = 1;
          zIndexOffset = 500;
          textColor = '#ffffff';
        } else if (m.isPartiallyVisited) {
          bgColor = currentTheme.markerPartialColor || '#f59e0b';
          border = MAP_MARKER_THEME.PARK.BORDER_SOME;
          boxShadow = MAP_MARKER_THEME.PARK.BOX_SHADOW_SOME;
          opacity = 1;
          zIndexOffset = 400;
          textColor = '#ffffff';
        } else if (isWantToVisit) {
          bgColor = MAP_THEME.WANT_TO_VISIT_COLOR;
          border = MAP_MARKER_THEME.PARK.BORDER_WANT;
          boxShadow = MAP_MARKER_THEME.PARK.BOX_SHADOW_WANT;
          opacity = 1;
          zIndexOffset = 450;
          textColor = '#ffffff';
        } else {
          bgColor = MAP_MARKER_THEME.PARK.UNVISITED_BG;
          border = MAP_MARKER_THEME.PARK.BORDER_NONE;
          boxShadow = MAP_MARKER_THEME.PARK.BOX_SHADOW_NONE;
          opacity = MAP_MARKER_THEME.PARK.UNVISITED_OPACITY;
          zIndexOffset = 0;
          textColor = '#cbd5e1';
        }
      } else {
        if (m.isAllVisited || (m.visited && !m.isPartiallyVisited)) {
          bgColor = currentTheme.markerVisitedColor || '#22c55e';
          const strokeColor =
            currentTheme.stateVisitedStroke || currentTheme.markerVisitedColor || '#16a34a';
          border = `2px solid ${strokeColor}`;
          boxShadow = markerTheme.BOX_SHADOW_ALL;
          opacity = 1;
          zIndexOffset = 500;
          textColor = '#ffffff';
        } else if (m.isPartiallyVisited) {
          bgColor = currentTheme.markerPartialColor || '#f59e0b';
          const strokeColor =
            currentTheme.statePartialStroke || currentTheme.markerPartialColor || '#d97706';
          border = `2px solid ${strokeColor}`;
          boxShadow = markerTheme.BOX_SHADOW_SOME;
          opacity = 1;
          zIndexOffset = 400;
          textColor = '#ffffff';
        } else if (isWantToVisit) {
          bgColor = MAP_THEME.WANT_TO_VISIT_COLOR;
          border = MAP_MARKER_THEME.STATE.BORDER_WANT;
          boxShadow = MAP_MARKER_THEME.STATE.BOX_SHADOW_WANT;
          opacity = 1;
          zIndexOffset = 450;
          textColor = '#ffffff';
        } else {
          bgColor = currentTheme.markerUnvisitedColor || '#64748b';
          const strokeColor =
            currentTheme.stateUnvisitedStroke || currentTheme.markerUnvisitedColor || '#475569';
          border = `2px solid ${strokeColor}`;
          boxShadow = markerTheme.BOX_SHADOW_NONE;
          opacity = 0.85;
          zIndexOffset = 0;
          textColor = '#ffffff';
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
            isCountryCapital: !!m.isCountryCapital,
            originalId,
            visited: !!m.visited,
            wantToVisit: isWantToVisit,
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
        const isCanada = m.country === 'Canada' || m.sub === 'Canada';
        let iconChar: string;
        if (m.category === 'state_park') {
          iconChar = '🌲';
        } else if (m.category === 'landmark') {
          iconChar = '🗽';
        } else if (m.category === 'theme_park') {
          iconChar = '🎢';
        } else if (m.category === 'city') {
          iconChar = '🏙️';
        } else if (m.category === 'custom') {
          iconChar = '📍';
        } else if (isPark) {
          iconChar = isCanada
            ? MAP_MARKER_THEME.PARK.ICON_CHAR_CA
            : MAP_MARKER_THEME.PARK.ICON_CHAR_US;
        } else if (m.isCountryCapital) {
          iconChar = isCanada
            ? MAP_MARKER_THEME.STATE.ICON_COUNTRY_CAPITAL_CA
            : MAP_MARKER_THEME.STATE.ICON_COUNTRY_CAPITAL_US;
        } else {
          iconChar = isCanada
            ? MAP_MARKER_THEME.STATE.ICON_CHAR_CA
            : MAP_MARKER_THEME.STATE.ICON_CHAR_US;
        }
        const starPipHtml = isWantToVisit ? WANT_TO_VISIT_STAR_PIP_HTML : '';
        const iconHtml = `<div class="relative flex items-center justify-center transition-all duration-300" style="position: relative; width:${markerTheme.DIAMETER}px; height:${markerTheme.DIAMETER}px; background-color:${bgColor}; color:${textColor}; border-radius:50%; border: ${border}; box-shadow: ${boxShadow}; opacity: ${opacity}; font-size:${markerTheme.FONT_SIZE}; line-height: 1;">${iconChar}${starPipHtml}</div>`;
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
