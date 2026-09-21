// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { ColorThemeDefinition } from '../../../core/constants/theme.constants';
import { STATE_SHADING_THEME } from '../../../core/constants/map.constants';
import { AppSettings, FamilyMember } from '../../../models/settings.model';
import { MapMode } from '../../../models/location.model';
import { buildLocationPopupHtml, LocationPopupMemberVisit } from '../utils/map-popup.util';

export interface RenderStateShadingOptions {
  map: L.Map;
  settings: AppSettings;
  statesGeoJson: GeoJSON.GeoJsonObject | null | undefined;
  mapMode: MapMode;
  currentTheme: ColorThemeDefinition;
  currentSearchTerm: string;
  familyMembers: FamilyMember[];
  showStatesShading?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MapShadingService {
  private stateGeoJsonLayer?: L.GeoJSON;

  /**
   * Renders state and province polygon shading layers onto the Leaflet map.
   */
  public renderStateShading(options: RenderStateShadingOptions): L.GeoJSON | undefined {
    const {
      map,
      settings,
      statesGeoJson,
      mapMode,
      currentTheme,
      currentSearchTerm,
      familyMembers,
      showStatesShading = true,
    } = options;

    this.clear();

    if (
      !map ||
      !showStatesShading ||
      (mapMode !== 'states' && mapMode !== 'parks' && mapMode !== 'places') ||
      !statesGeoJson
    ) {
      return undefined;
    }

    const isParksMode = mapMode === 'parks';
    const totalFamily = settings.familyMembers?.length || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFeatureStyle = (feature: any): L.PathOptions => {
      if (!feature) {
        return {
          fillColor: currentTheme.stateUnvisitedFill,
          fillOpacity: 0.1,
          color: currentTheme.stateUnvisitedStroke,
          weight: 0.75,
        };
      }
      const stateId = feature.id as string;
      const visitDetails = settings.visitedStates?.[stateId] || [];
      const locationLogs = settings.locationVisits?.[stateId] || [];
      const visitors = visitDetails
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((v: any) => settings.familyMembers?.find((m) => m.id === v.memberId))
        .filter(Boolean);

      const isAllVisited =
        totalFamily > 0
          ? visitors.length === totalFamily
          : visitDetails.length > 0 || locationLogs.length > 0;
      const isPartiallyVisited =
        totalFamily > 1 && visitors.length > 0 && visitors.length < totalFamily;

      const stateName = (feature.properties?.name || feature.id || '').toLowerCase();
      const matchesSearch = !currentSearchTerm || stateName.includes(currentSearchTerm);

      if (!matchesSearch) {
        return {
          fillColor: currentTheme.stateUnvisitedFill,
          fillOpacity: 0.03,
          color: currentTheme.stateUnvisitedStroke,
          weight: 0.5,
        };
      }
      const wantDetails = settings.wantToVisitStates?.[stateId] || [];
      const hasWantToVisit = wantDetails.length > 0;

      if (isAllVisited) {
        return {
          fillColor: currentTheme.stateVisitedFill,
          fillOpacity: 0.45,
          color: currentTheme.stateVisitedStroke,
          weight: 1.5,
        };
      }
      if (isPartiallyVisited) {
        return {
          fillColor: currentTheme.statePartialFill,
          fillOpacity: 0.4,
          color: currentTheme.statePartialStroke,
          weight: 1.5,
        };
      }
      if (hasWantToVisit) {
        return {
          fillColor: '#9333ea',
          fillOpacity: 0.35,
          color: '#7e22ce',
          weight: 1.5,
        };
      }
      return {
        fillColor: currentTheme.stateUnvisitedFill,
        fillOpacity: 0.1,
        color: currentTheme.stateUnvisitedStroke,
        weight: 0.75,
      };
    };

    // DOCS: https://leafletjs.com/reference.html#geojson
    this.stateGeoJsonLayer = L.geoJSON(statesGeoJson, {
      pane: STATE_SHADING_THEME.PANE_NAME,
      interactive: !isParksMode,
      style: (feature) => getFeatureStyle(feature),
      onEachFeature: (feature, featureLayer) => {
        if (isParksMode) {
          return;
        }
        const stateId = feature.id as string;
        const stateName = feature.properties?.name || feature.id;
        const visitDetails = settings.visitedStates?.[stateId] || [];
        const wantDetails = settings.wantToVisitStates?.[stateId] || [];
        const locationLogs = settings.locationVisits?.[stateId] || [];
        const isVisited = visitDetails.length > 0 || locationLogs.length > 0;
        const isWant = !isVisited && wantDetails.length > 0;

        const visitors: LocationPopupMemberVisit[] = [];
        for (const v of visitDetails) {
          const mem = settings.familyMembers?.find((m) => m.id === v.memberId);
          if (mem) {
            visitors.push({
              ...mem,
              date: v.firstVisitedDate || v.dateVisited,
              notes: v.notes,
            });
          }
        }

        const popupHtml = buildLocationPopupHtml(
          {
            name: stateName,
            isPark: false,
            originalId: stateId,
            visited: isVisited,
            wantToVisit: isWant,
            visitedByMembers: visitors,
            visitLogs: locationLogs,
          },
          familyMembers,
        );

        featureLayer.bindPopup(popupHtml);

        featureLayer.on({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mouseover: (e: any) => {
            const currentStyle = getFeatureStyle(feature);
            e.target.setStyle({
              weight: STATE_SHADING_THEME.HOVER.weight,
              fillOpacity: Math.min(
                (currentStyle.fillOpacity ?? 0) + STATE_SHADING_THEME.HOVER.fillOpacityBoost,
                STATE_SHADING_THEME.HOVER.maxOpacity,
              ),
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mouseout: (e: any) => {
            e.target.setStyle(getFeatureStyle(feature));
          },
        });
      },
    }).addTo(map);

    return this.stateGeoJsonLayer;
  }

  /**
   * Cleans up the GeoJSON layer.
   */
  public clear(): void {
    if (this.stateGeoJsonLayer) {
      this.stateGeoJsonLayer.remove();
      this.stateGeoJsonLayer = undefined;
    }
  }
}
