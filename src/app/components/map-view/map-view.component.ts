/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { StateService } from '../../services/state.service';
// DOCS: https://rxjs.dev/api/index/class/Subject
import { Subject, takeUntil, combineLatest } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { RouteObject } from '../../models/route.model';
import {
  MAP_THEME,
  STATE_SHADING_THEME,
  MAP_MARKER_THEME,
} from '../../core/constants/map.constants';
import { LocationDataService } from '../../services/location-data.service';
import { LocationPoint } from '../../models/location.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { RoutingService } from '../../services/routing/routing.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StatsModal } from '../stats-modal/stats-modal';
import { ParksStatesModal } from '../parks-states-modal/parks-states-modal';
import { HelpModalComponent } from '../help-modal/help-modal.component';
import { LoggerService } from '../../core/services/logger.service';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  AVAILABLE_THEMES_LIST,
  ColorThemeId,
  ColorThemeDefinition,
} from '../../core/constants/theme.constants';

const METERS_PER_MILE = 1609.34;
const ROADS_HOMETOWN_RADIUS_MILES = 300;
const NORTH_AMERICA_BOUNDS: L.LatLngBoundsLiteral = [
  [22.0, -132.0],
  [60.0, -55.0],
];

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, GlobalSearchComponent, StatsModal, ParksStatesModal, HelpModalComponent],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
})
export class MapViewComponent implements OnInit, OnDestroy {
  @Output() settingsClick = new EventEmitter<void>();

  private map!: L.Map;
  private baseTileLayer!: L.TileLayer;
  private destroy$ = new Subject<void>();
  showStatsModal = false;
  showParksStatesModal = false;
  showHelpModal = false;
  parksStatesModalMode: 'parks' | 'states' = 'parks';
  @ViewChild('themeMenuRef') themeMenuRef?: ElementRef;
  showThemeMenu = false;
  availableThemes = AVAILABLE_THEMES_LIST;
  currentThemeId: ColorThemeId = DEFAULT_THEME_ID;
  currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];

  toggleThemeMenu(): void {
    this.showThemeMenu = !this.showThemeMenu;
  }

  selectTheme(id: ColorThemeId): void {
    this.stateService.setColorTheme(id);
    this.showThemeMenu = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showThemeMenu && this.themeMenuRef?.nativeElement) {
      if (!this.themeMenuRef.nativeElement.contains(event.target as Node)) {
        this.showThemeMenu = false;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showThemeMenu) {
      this.showThemeMenu = false;
    }
  }

  openSettings(): void {
    this.settingsClick.emit();
  }

  openParksModal(): void {
    this.stateService.setMapMode('parks');
    this.parksStatesModalMode = 'parks';
    this.showParksStatesModal = true;
  }

  openStatesModal(): void {
    this.stateService.setMapMode('states');
    this.parksStatesModalMode = 'states';
    this.showParksStatesModal = true;
  }

  openRoads(): void {
    this.stateService.setMapMode('roads');
    this.stateService.triggerNewRoadTrip();
  }

  private currentLayerGroup!: L.LayerGroup;
  private stateGeoJsonLayer?: L.GeoJSON;
  private currentPolyline: L.Polyline | null = null;
  private currentPolylines: L.Polyline[] = [];
  private allLocations: LocationPoint[] = [];
  private currentSearchTerm = '';
  mapMode: 'parks' | 'states' | 'roads' = 'parks';
  private routeCoordinatesCache: { [timestamp: number]: [number, number][] } = {};
  private familyMembers: import('../../models/settings.model').FamilyMember[] = [];

  constructor(
    private stateService: StateService,
    private locationDataService: LocationDataService,
    private routingService: RoutingService,
    private el: ElementRef,
    private logger: LoggerService,
  ) {}

  ngOnInit() {
    this.initMap();

    this.stateService.colorTheme$.pipe(takeUntil(this.destroy$)).subscribe((themeId) => {
      this.currentThemeId = themeId;
      this.currentTheme = COLOR_THEMES[themeId] || COLOR_THEMES[DEFAULT_THEME_ID];
    });

    combineLatest([
      this.stateService.settings$,
      this.stateService.searchTerm$,
      this.stateService.mapMode$,
      this.stateService.selectedRoute$,
      this.locationDataService.parks$,
      this.locationDataService.states$,
      this.locationDataService.statesGeoJson$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([settings, searchTerm, mapMode, selectedRoute, parks, states, statesGeoJson]) => {
        this.currentSearchTerm = searchTerm.toLowerCase();
        this.mapMode = mapMode;
        this.familyMembers = settings.familyMembers;

        const hometowns: LocationPoint[] = settings.hometowns.map(
          (h, idx) =>
            ({
              id: `hometown-${h.id}`,
              name: h.name,
              lat: h.lat,
              lng: h.lng,
              region: '',
              visited: true,
              visitedBy: [],
              isLast: idx === settings.hometowns.length - 1,
            }) as any,
        );

        const mergedParks = parks.map((p) => {
          const originalId = p.id.replace('park-', '');
          const visitDetails = settings.visitedParks?.[originalId] || [];
          const visitors = visitDetails
            .map((v) => {
              const mem = settings.familyMembers.find((m) => m.id === v.memberId);
              if (!mem) return null;
              return {
                ...mem,
                date: v.firstVisitedDate || v.dateVisited,
                notes: v.notes,
              };
            })
            .filter(Boolean);
          const locationLogs = settings.locationVisits?.[originalId] || [];
          return {
            ...p,
            visited: visitDetails.length > 0 || locationLogs.length > 0,
            visitedByMembers: visitors,
            visitLogs: locationLogs,
          };
        });

        const mergedStates = states.map((s) => {
          const originalId = s.id.replace('state-', '');
          const visitDetails = settings.visitedStates?.[originalId] || [];
          const visitors = visitDetails
            .map((v) => {
              const mem = settings.familyMembers.find((m) => m.id === v.memberId);
              if (!mem) return null;
              return {
                ...mem,
                date: v.firstVisitedDate || v.dateVisited,
                notes: v.notes,
              };
            })
            .filter(Boolean);
          const locationLogs = settings.locationVisits?.[originalId] || [];
          return {
            ...s,
            visited: visitDetails.length > 0 || locationLogs.length > 0,
            visitedByMembers: visitors,
            visitLogs: locationLogs,
          };
        });

        this.allLocations = [...mergedParks, ...mergedStates, ...hometowns];

        this.filterMarkers(this.currentSearchTerm);
        this.renderStateShading(settings, statesGeoJson);

        const hasHometown = settings.hometowns && settings.hometowns.length > 0;

        if (this.map) {
          setTimeout(() => {
            if (!this.map || typeof this.map.invalidateSize !== 'function') return;
            this.map.invalidateSize();
            this.applyModeZoom(settings, selectedRoute);
          }, 100);
        }

        const effectiveCartoKey = settings.cartoKey || environment.cartoKey;
        if (this.baseTileLayer && effectiveCartoKey && effectiveCartoKey !== 'YOUR_CARTO_API_KEY') {
          this.baseTileLayer.setUrl(
            `${API_ENDPOINTS.CARTO_TILE_LAYER}?api_key=${effectiveCartoKey}`,
          );
        } else if (this.baseTileLayer) {
          this.baseTileLayer.setUrl(API_ENDPOINTS.OSM_TILE_LAYER);
        }

        this.renderRoutes(settings.savedRoutes, selectedRoute, hasHometown);
      });
  }

  private initMap() {
    L.Icon.Default.imagePath = 'leaflet/';
    const mapContainer = this.el.nativeElement.querySelector('#map');
    this.map = L.map(mapContainer).setView([39.8283, -98.5795], 4);

    // DOCS: https://leafletjs.com/reference.html#map-createpane
    if (!this.map.getPane(STATE_SHADING_THEME.PANE_NAME)) {
      this.map.createPane(STATE_SHADING_THEME.PANE_NAME);
      const pane = this.map.getPane(STATE_SHADING_THEME.PANE_NAME);
      if (pane) {
        pane.style.zIndex = STATE_SHADING_THEME.PANE_Z_INDEX;
      }
    }

    const cartoKey = environment.cartoKey;
    const tileUrl =
      cartoKey && cartoKey !== 'YOUR_CARTO_API_KEY'
        ? `${API_ENDPOINTS.CARTO_TILE_LAYER}?api_key=${cartoKey}`
        : API_ENDPOINTS.OSM_TILE_LAYER;

    this.baseTileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap, © CARTO',
    }).addTo(this.map);

    this.currentLayerGroup = L.layerGroup().addTo(this.map);

    this.map.on('popupopen', (e: any) => {
      const editBtn = e.popup._contentNode?.querySelector('.edit-location-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          const locId = editBtn.getAttribute('data-id');
          const mode = editBtn.getAttribute('data-mode');
          if (locId && mode) {
            this.stateService.setEditingLocation({ id: locId, mode: mode as 'parks' | 'states' });
            this.map?.closePopup();
          }
        });
      }
    });
  }

  setMapMode(mode: 'parks' | 'states' | 'roads') {
    this.stateService.setMapMode(mode);
  }

  private filterMarkers(term: string) {
    if (!this.map || !this.currentLayerGroup) return;

    this.currentLayerGroup.clearLayers();

    const lowerTerm = term.toLowerCase();
    const filtered = this.allLocations.filter((m) => {
      // Always show hometowns
      if (m.id.startsWith('hometown-')) {
        return m.name.toLowerCase().includes(lowerTerm);
      }

      // Filter by map mode
      if (this.mapMode === 'roads') return false;
      if (this.mapMode === 'parks' && !m.id.includes('park')) return false;
      if (this.mapMode === 'states' && !m.id.includes('state')) return false;

      return m.name.toLowerCase().includes(lowerTerm);
    });

    filtered.forEach((m: any) => {
      if (m.lat === 0 && m.lng === 0) return; // Skip if no coordinates

      const isPark = m.id.includes('park');
      const markerTheme = isPark ? MAP_MARKER_THEME.PARK : MAP_MARKER_THEME.STATE;
      const color = m.visited ? '#22c55e' : '#94a3b8'; // Green if visited, slate if unvisited

      let popupHtml = '';
      if (m.id.startsWith('hometown-')) {
        popupHtml = `<strong>${m.name} (${m.isLast ? 'Hometown' : 'Previous Hometown'})</strong>`;
      } else {
        const originalId = m.id.replace('park-', '').replace('state-', '');
        popupHtml = this.buildLocationPopupHtml({
          name: m.name,
          isPark,
          originalId,
          visitedByMembers: m.visitedByMembers,
          visitLogs: m.visitLogs,
        });
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
          .addTo(this.currentLayerGroup);
      } else {
        const iconHtml = `<div class="flex items-center justify-center transition-all duration-300" style="width:${markerTheme.DIAMETER}px; height:${markerTheme.DIAMETER}px; background-color:${color}; border-radius:50%; border: ${markerTheme.BORDER}; box-shadow: ${markerTheme.BOX_SHADOW}; font-size:${markerTheme.FONT_SIZE}; color: white; line-height: 1;">${markerTheme.ICON_CHAR}</div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [markerTheme.DIAMETER, markerTheme.DIAMETER],
          iconAnchor: [markerTheme.ANCHOR, markerTheme.ANCHOR],
          popupAnchor: [0, -markerTheme.ANCHOR],
        });
        L.marker([m.lat, m.lng], { icon }).bindPopup(popupHtml).addTo(this.currentLayerGroup);
      }
    });
  }

  private buildLocationPopupHtml(params: {
    name: string;
    isPark: boolean;
    originalId: string;
    visitedByMembers?: any[];
    visitLogs?: any[];
  }): string {
    const subLabel = params.isPark ? 'National Park' : 'State / Province';
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(params.name).replace(/%20/g, '_')}`;

    const membersHtml = this.familyMembers
      .map((member: any) => {
        const hasVisited = params.visitedByMembers?.some((v: any) => v.id === member.id);
        let visitText = 'No';

        if (hasVisited) {
          const visitObj = params.visitedByMembers?.find((v: any) => v.id === member.id);
          visitText = visitObj?.date ? `Yes (${visitObj.date})` : 'Yes';
        }

        return `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#57534e;">${member.name}</span>
          <span style="color:${hasVisited ? '#16a34a' : '#d6d3d1'}; font-weight:${hasVisited ? 'bold' : 'normal'}; font-size:12px;">${visitText}</span>
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
            <strong style="font-size: 14px; display: block; color: #292524;">${params.name}</strong>
            <span style="font-size: 12px; color: #78716c; display: block; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; margin-bottom: 4px;">${subLabel}</span>
            
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

  private renderStateShading(settings: any, statesGeoJson: any) {
    if (!this.map) return;

    if (this.stateGeoJsonLayer) {
      this.stateGeoJsonLayer.remove();
      this.stateGeoJsonLayer = undefined;
    }

    if (this.mapMode !== 'states' || !statesGeoJson) {
      return;
    }

    const totalFamily = settings.familyMembers?.length || 0;

    const getFeatureStyle = (feature: any): L.PathOptions => {
      if (!feature) return STATE_SHADING_THEME.UNVISITED;
      const stateId = feature.id as string;
      const visitDetails = settings.visitedStates?.[stateId] || [];
      const locationLogs = settings.locationVisits?.[stateId] || [];
      const visitors = visitDetails
        .map((v: any) => settings.familyMembers?.find((m: any) => m.id === v.memberId))
        .filter(Boolean);

      const isAllVisited =
        totalFamily > 0
          ? visitors.length === totalFamily
          : visitDetails.length > 0 || locationLogs.length > 0;
      const isPartiallyVisited =
        totalFamily > 1 && visitors.length > 0 && visitors.length < totalFamily;

      const stateName = (feature.properties?.name || feature.id || '').toLowerCase();
      const matchesSearch = !this.currentSearchTerm || stateName.includes(this.currentSearchTerm);

      if (!matchesSearch) {
        return { ...STATE_SHADING_THEME.DIMMED };
      }
      if (isAllVisited) {
        return { ...STATE_SHADING_THEME.ALL_VISITED };
      }
      if (isPartiallyVisited) {
        return { ...STATE_SHADING_THEME.PARTIALLY_VISITED };
      }
      return { ...STATE_SHADING_THEME.UNVISITED };
    };

    // DOCS: https://leafletjs.com/reference.html#geojson
    this.stateGeoJsonLayer = L.geoJSON(statesGeoJson, {
      pane: STATE_SHADING_THEME.PANE_NAME,
      style: (feature) => getFeatureStyle(feature),
      onEachFeature: (feature, featureLayer) => {
        const stateId = feature.id as string;
        const stateName = feature.properties?.name || feature.id;
        const visitDetails = settings.visitedStates?.[stateId] || [];
        const locationLogs = settings.locationVisits?.[stateId] || [];
        const visitors = visitDetails
          .map((v: any) => {
            const mem = settings.familyMembers?.find((m: any) => m.id === v.memberId);
            if (!mem) return null;
            return {
              ...mem,
              date: v.firstVisitedDate || v.dateVisited,
              notes: v.notes,
            };
          })
          .filter(Boolean);

        const popupHtml = this.buildLocationPopupHtml({
          name: stateName,
          isPark: false,
          originalId: stateId,
          visitedByMembers: visitors,
          visitLogs: locationLogs,
        });

        featureLayer.bindPopup(popupHtml);

        featureLayer.on({
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
          mouseout: (e: any) => {
            e.target.setStyle(getFeatureStyle(feature));
          },
        });
      },
    }).addTo(this.map);
  }

  private applyModeZoom(
    settings: import('../../models/settings.model').AppSettings,
    selectedRoute?: RouteObject | null,
  ): void {
    if (!this.map || typeof this.map.fitBounds !== 'function') return;

    if (this.mapMode === 'parks' || this.mapMode === 'states') {
      this.map.fitBounds(NORTH_AMERICA_BOUNDS, { padding: [20, 20] });
    } else if (this.mapMode === 'roads') {
      if (selectedRoute) {
        return;
      }
      const currentHome =
        settings.hometowns.find((h) => !h.endDate) ||
        (settings.hometowns.length > 0
          ? settings.hometowns[settings.hometowns.length - 1]
          : undefined);

      if (currentHome) {
        const hometownRadiusMeters = ROADS_HOMETOWN_RADIUS_MILES * METERS_PER_MILE;
        const bounds = L.latLng(currentHome.lat, currentHome.lng).toBounds(hometownRadiusMeters);
        this.map.fitBounds(bounds);
      }
    }
  }

  private async renderRoutes(
    savedRoutes: RouteObject[] = [],
    selectedRoute: RouteObject | null,
    hasHometown: boolean = false,
  ) {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];

    if (selectedRoute) {
      let coords =
        selectedRoute.coordinates && selectedRoute.coordinates.length > 0
          ? selectedRoute.coordinates
          : selectedRoute.route && selectedRoute.route.length > 0
            ? selectedRoute.route
            : this.routeCoordinatesCache[selectedRoute.timestamp];

      if (!coords && selectedRoute.waypoints && selectedRoute.waypoints.length > 0) {
        try {
          const options = await firstValueFrom(
            this.routingService.getRoutes(selectedRoute.engine, selectedRoute.waypoints),
          );
          if (options && options.length > 0) {
            coords = options[0].route;
            this.routeCoordinatesCache[selectedRoute.timestamp] = coords;
          }
        } catch (e) {
          this.logger.error('Failed to calculate route for rendering', e);
        }
      }

      if (coords && coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: MAP_THEME.ROUTE_POLYLINE_COLOR,
          weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
          opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
        }).addTo(this.map);

        if (selectedRoute.name) {
          polyline.bindTooltip(selectedRoute.name, { sticky: true });
        }

        this.currentPolylines.push(polyline);
        const bounds = polyline.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } else if (savedRoutes && savedRoutes.length > 0) {
      const allBounds: L.LatLngBounds[] = [];

      for (const route of savedRoutes) {
        let coords =
          route.coordinates && route.coordinates.length > 0
            ? route.coordinates
            : route.route && route.route.length > 0
              ? route.route
              : this.routeCoordinatesCache[route.timestamp];

        if (!coords && route.waypoints && route.waypoints.length > 0) {
          try {
            const options = await firstValueFrom(
              this.routingService.getRoutes(route.engine, route.waypoints),
            );
            if (options && options.length > 0) {
              coords = options[0].route;
              this.routeCoordinatesCache[route.timestamp] = coords;
            }
          } catch (e) {
            this.logger.error(`Failed to calculate route ${route.name}`, e);
          }
        }

        if (coords && coords.length > 0) {
          const polyline = L.polyline(coords, {
            color: MAP_THEME.ROUTE_POLYLINE_COLOR,
            weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
            opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
          }).addTo(this.map);

          if (route.name) {
            polyline.bindTooltip(route.name, { sticky: true });
          }

          this.currentPolylines.push(polyline);
          const b = polyline.getBounds();
          if (b.isValid()) {
            allBounds.push(b);
          }
        }
      }

      if (allBounds.length > 0 && !hasHometown) {
        let groupBounds = allBounds[0];
        for (let i = 1; i < allBounds.length; i++) {
          groupBounds = groupBounds.extend(allBounds[i]);
        }
        if (groupBounds.isValid()) {
          this.map.fitBounds(groupBounds, { padding: [50, 50] });
        }
      }
    }
  }

  private reduceCoordinates(route: [number, number][], routeReduction: number): [number, number][] {
    const reduced = [];
    const step = Math.max(1, Math.ceil(1 / routeReduction));
    for (let i = 0; i < route.length; i += step) {
      reduced.push(route[i]);
    }
    if (reduced[reduced.length - 1] !== route[route.length - 1]) {
      reduced.push(route[route.length - 1]);
    }
    return reduced;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.stateGeoJsonLayer) {
      this.stateGeoJsonLayer.remove();
      this.stateGeoJsonLayer = undefined;
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
