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
    const getFeatureVisitState = (feature: any) => {
      const stateId = feature?.id as string;
      const codeId = feature?.properties?.id || feature?.properties?.code;

      const visitDetails = [
        ...(settings.visitedStates?.[stateId] || []),
        ...(codeId && codeId !== stateId ? settings.visitedStates?.[codeId] || [] : []),
      ];
      const wantDetails = [
        ...(settings.wantToVisitStates?.[stateId] || []),
        ...(codeId && codeId !== stateId ? settings.wantToVisitStates?.[codeId] || [] : []),
      ];
      const v4Visits = [
        ...(settings.placeVisits?.[stateId] || []),
        ...(codeId && codeId !== stateId ? settings.placeVisits?.[codeId] || [] : []),
      ];
      const locationLogs = [
        ...(settings.locationVisits?.[stateId] || []),
        ...(codeId && codeId !== stateId ? settings.locationVisits?.[codeId] || [] : []),
      ];

      const visitedMemberMap = new Map<string, LocationPopupMemberVisit>();
      for (const v of visitDetails) {
        const mem = settings.familyMembers?.find((m) => m.id === v.memberId);
        if (mem && !visitedMemberMap.has(mem.id)) {
          visitedMemberMap.set(mem.id, {
            ...mem,
            date: v.firstVisitedDate || v.dateVisited,
            notes: v.notes,
          });
        }
      }
      for (const v of v4Visits) {
        if (v.status === 'visited') {
          const mem = settings.familyMembers?.find((m) => m.id === v.memberId);
          if (mem && !visitedMemberMap.has(mem.id)) {
            visitedMemberMap.set(mem.id, {
              ...mem,
              date: v.dateVisited,
              notes: v.notes,
            });
          }
        }
      }

      const visitors = Array.from(visitedMemberMap.values());
      const v4VisitedCount = v4Visits.filter((v) => v.status === 'visited').length;
      const v4WantCount = v4Visits.filter((v) => v.status === 'want_to_visit').length;

      const isVisited =
        visitors.length > 0 ||
        visitDetails.length > 0 ||
        v4VisitedCount > 0 ||
        locationLogs.length > 0;
      const isAllVisited = totalFamily > 0 ? visitors.length === totalFamily : isVisited;
      const isPartiallyVisited =
        totalFamily > 1 && visitors.length > 0 && visitors.length < totalFamily;
      const hasWantToVisit = !isVisited && (wantDetails.length > 0 || v4WantCount > 0);

      return {
        stateId,
        visitors,
        locationLogs,
        isVisited,
        isAllVisited,
        isPartiallyVisited,
        hasWantToVisit,
      };
    };

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
      const { isAllVisited, isPartiallyVisited, hasWantToVisit } = getFeatureVisitState(feature);

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
        const stateName = feature.properties?.name || feature.id;
        const { stateId, visitors, locationLogs, isVisited, hasWantToVisit } =
          getFeatureVisitState(feature);

        const popupHtml = buildLocationPopupHtml(
          {
            name: stateName,
            isPark: false,
            originalId: stateId,
            visited: isVisited,
            wantToVisit: hasWantToVisit,
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
