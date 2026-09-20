// DOCS: https://angular.dev/api/core/Component
import { Component, OnInit, OnDestroy, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { Subject, Observable, takeUntil, combineLatest } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { RouteObject } from '../../models/route.model';
import { LocationDataService } from '../../services/location-data.service';
import { LocationPoint } from '../../models/location.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { environment } from '../../../environments/environment';
import { ParksStatesModal } from '../parks-states-modal/parks-states-modal';
import { LoggerService } from '../../core/services/logger.service';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  ColorThemeId,
  ColorThemeDefinition,
} from '../../core/constants/theme.constants';
import {
  STATES,
  NATIONAL_PARKS,
  TOTAL_US_STATES,
  TOTAL_CA_PROVINCES,
  TOTAL_US_PARKS,
  TOTAL_CA_PARKS,
} from '../../core/constants/geography.constants';
import { AppSettings, FamilyMember } from '../../models/settings.model';
import { MAP_THEME, STATE_SHADING_THEME } from '../../core/constants/map.constants';
import { MapStatsLegendComponent } from './components/map-stats-legend/map-stats-legend.component';
import { MapVisitedLegendComponent } from './components/map-visited-legend/map-visited-legend.component';
import { MapShadingService } from './services/map-shading.service';
import { MapMarkerService } from './services/map-marker.service';
import { MapRouteService } from './services/map-route.service';

const METERS_PER_MILE = 1609.34;
const ROADS_HOMETOWN_RADIUS_MILES = 300;
const NORTH_AMERICA_BOUNDS: L.LatLngBoundsLiteral = [
  [22.0, -132.0],
  [60.0, -55.0],
];

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, ParksStatesModal, MapStatsLegendComponent, MapVisitedLegendComponent],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
})
export class MapViewComponent implements OnInit, OnDestroy {
  @Output() settingsClick = new EventEmitter<void>();

  private map!: L.Map;
  private baseTileLayer!: L.TileLayer;
  private currentTileUrl = '';
  private destroy$ = new Subject<void>();

  private resizeObserver?: ResizeObserver;
  showParksStatesModal = false;
  parksStatesModalMode: 'parks' | 'states' = 'parks';
  currentThemeId: ColorThemeId = DEFAULT_THEME_ID;
  currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];

  currentSettings: AppSettings | null = null;
  readonly TOTAL_US_STATES = TOTAL_US_STATES;
  readonly TOTAL_CA_PROVINCES = TOTAL_CA_PROVINCES;
  readonly TOTAL_US_PARKS = TOTAL_US_PARKS;
  readonly TOTAL_CA_PARKS = TOTAL_CA_PARKS;

  get visitedUSStatesCount(): number {
    const visited = this.currentSettings?.visitedStates || {};
    return Object.keys(visited).filter((id) => {
      const isUS = STATES.some((s) => s.id === id && s.country !== 'Canada' && s.sub !== 'Canada');
      const logs = this.currentSettings?.locationVisits?.[id] || [];
      return isUS && ((visited[id] && visited[id].length > 0) || logs.length > 0);
    }).length;
  }

  get visitedCAProvincesCount(): number {
    const visited = this.currentSettings?.visitedStates || {};
    return Object.keys(visited).filter((id) => {
      const isCA = STATES.some(
        (s) => s.id === id && (s.country === 'Canada' || s.sub === 'Canada'),
      );
      const logs = this.currentSettings?.locationVisits?.[id] || [];
      return isCA && ((visited[id] && visited[id].length > 0) || logs.length > 0);
    }).length;
  }

  get visitedUSParksCount(): number {
    const visited = this.currentSettings?.visitedParks || {};
    return Object.keys(visited).filter((id) => {
      const isUS = NATIONAL_PARKS.some((p) => p.id === id && p.country !== 'Canada');
      const logs = this.currentSettings?.locationVisits?.[id] || [];
      return isUS && ((visited[id] && visited[id].length > 0) || logs.length > 0);
    }).length;
  }

  get visitedCAParksCount(): number {
    const visited = this.currentSettings?.visitedParks || {};
    return Object.keys(visited).filter((id) => {
      const isCA = NATIONAL_PARKS.some((p) => p.id === id && p.country === 'Canada');
      const logs = this.currentSettings?.locationVisits?.[id] || [];
      return isCA && ((visited[id] && visited[id].length > 0) || logs.length > 0);
    }).length;
  }

  openParksModal(): void {
    this.parksStatesModalMode = 'parks';
    this.showParksStatesModal = true;
  }

  openStatesModal(): void {
    this.parksStatesModalMode = 'states';
    this.showParksStatesModal = true;
  }

  openRoads(): void {
    this.stateService.triggerNewRoadTrip();
  }

  isDetailsDrawerOpen$: Observable<boolean>;
  readonly wantToVisitColor = MAP_THEME.WANT_TO_VISIT_COLOR;

  toggleDetailsDrawer(): void {
    this.stateService.setDetailsDrawerOpen(!this.stateService.isDetailsDrawerOpen());
  }

  invalidateSize(): void {
    if (this.map && typeof this.map.invalidateSize === 'function') {
      this.map.invalidateSize();
    }
  }

  private currentLayerGroup!: L.LayerGroup;
  private allLocations: LocationPoint[] = [];
  private currentSearchTerm = '';
  mapMode: 'parks' | 'states' | 'roads' = 'parks';
  private familyMembers: FamilyMember[] = [];

  constructor(
    private stateService: StateService,
    private locationDataService: LocationDataService,
    private mapShadingService: MapShadingService,
    private mapMarkerService: MapMarkerService,
    private mapRouteService: MapRouteService,
    private el: ElementRef,
    private logger: LoggerService,
  ) {
    this.isDetailsDrawerOpen$ = this.stateService.detailsDrawerOpen$;
  }

  ngOnInit() {
    this.initMap();

    combineLatest([
      this.stateService.settings$,
      this.stateService.searchTerm$,
      this.stateService.mapMode$,
      this.stateService.selectedRoute$,
      this.locationDataService.parks$,
      this.locationDataService.states$,
      this.locationDataService.statesGeoJson$,
      this.stateService.colorTheme$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([settings, searchTerm, mapMode, selectedRoute, parks, states, statesGeoJson, themeId]) => {
          this.currentThemeId = themeId;
          this.currentTheme = COLOR_THEMES[themeId] || COLOR_THEMES[DEFAULT_THEME_ID];
          this.currentSettings = settings;
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
              }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
            const totalFamily = settings.familyMembers?.length || 0;
            const isAllVisited =
              totalFamily > 0
                ? visitors.length === totalFamily
                : visitDetails.length > 0 || locationLogs.length > 0;
            const isPartiallyVisited =
              totalFamily > 1 && visitors.length > 0 && visitors.length < totalFamily;
            return {
              ...p,
              country: p.country || 'USA',
              sub: p.sub || '',
              visited: visitDetails.length > 0 || locationLogs.length > 0,
              isAllVisited,
              isPartiallyVisited,
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
            const totalFamily = settings.familyMembers?.length || 0;
            const isAllVisited =
              totalFamily > 0
                ? visitors.length === totalFamily
                : visitDetails.length > 0 || locationLogs.length > 0;
            const isPartiallyVisited =
              totalFamily > 1 && visitors.length > 0 && visitors.length < totalFamily;
            return {
              ...s,
              country: s.country || (s.sub === 'Canada' ? 'Canada' : 'USA'),
              visited: visitDetails.length > 0 || locationLogs.length > 0,
              isAllVisited,
              isPartiallyVisited,
              visitedByMembers: visitors,
              visitLogs: locationLogs,
            };
          });

          this.allLocations = [...mergedParks, ...mergedStates, ...hometowns];

          this.mapMarkerService.renderMarkers({
            layerGroup: this.currentLayerGroup,
            locations: this.allLocations,
            searchTerm: this.currentSearchTerm,
            mapMode: this.mapMode,
            currentTheme: this.currentTheme,
            familyMembers: this.familyMembers,
          });

          this.mapShadingService.renderStateShading({
            map: this.map,
            settings,
            statesGeoJson,
            mapMode: this.mapMode,
            currentTheme: this.currentTheme,
            currentSearchTerm: this.currentSearchTerm,
            familyMembers: this.familyMembers,
          });

          const hasHometown = settings.hometowns && settings.hometowns.length > 0;

          if (this.map) {
            setTimeout(() => {
              if (!this.map || typeof this.map.invalidateSize !== 'function') return;
              this.map.invalidateSize();
              this.applyModeZoom(settings, selectedRoute);
            }, 100);
          }

          const effectiveCartoKey = this.getEffectiveCartoKey(settings);
          const targetTileUrl = this.getTileUrl(effectiveCartoKey);
          if (this.baseTileLayer && this.currentTileUrl !== targetTileUrl) {
            this.currentTileUrl = targetTileUrl;
            this.baseTileLayer.setUrl(targetTileUrl);
          }

          this.mapRouteService.renderRoutes({
            map: this.map,
            savedRoutes: settings.savedRoutes,
            selectedRoute,
            mapMode: this.mapMode,
            hasHometown,
          });
        },
      );
  }

  /**
   * Retrieves the effective CARTO API key, preferring user custom settings over .env.
   */
  getEffectiveCartoKey(settings?: AppSettings): string {
    const fromSettings = (
      settings?.cartoKey ||
      this.currentSettings?.cartoKey ||
      this.stateService?.getSettings?.()?.cartoKey ||
      ''
    ).trim();
    if (fromSettings && fromSettings !== 'YOUR_CARTO_API_KEY') {
      return fromSettings;
    }
    const fromEnv = (environment.cartoKey || '').trim();
    if (fromEnv && fromEnv !== 'YOUR_CARTO_API_KEY') {
      return fromEnv;
    }
    return '';
  }

  /**
   * Returns the tile layer URL. CARTO Basemaps requires the '?key=' query parameter.
   * DOCS: https://carto.com/basemaps/apikey/
   */
  getTileUrl(cartoKey: string): string {
    if (cartoKey) {
      return `${API_ENDPOINTS.CARTO_TILE_LAYER}?key=${encodeURIComponent(cartoKey)}`;
    }
    return API_ENDPOINTS.OSM_TILE_LAYER;
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

    const effectiveCartoKey = this.getEffectiveCartoKey();
    this.currentTileUrl = this.getTileUrl(effectiveCartoKey);

    this.baseTileLayer = L.tileLayer(this.currentTileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap, © CARTO',
    }).addTo(this.map);

    this.currentLayerGroup = L.layerGroup().addTo(this.map);

    if (typeof ResizeObserver !== 'undefined' && mapContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        this.invalidateSize();
      });
      this.resizeObserver.observe(mapContainer);
    }

    this.map.on('popupopen', (e: L.PopupEvent) => {
      const contentNode = (e.popup as L.Popup & { _contentNode?: HTMLElement })._contentNode;
      const editBtn = contentNode?.querySelector('.edit-location-btn');
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

  private applyModeZoom(settings: AppSettings, selectedRoute?: RouteObject | null): void {
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapShadingService.clear();
    this.mapRouteService.clear();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
