/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { StateService } from '../../services/state.service';
// DOCS: https://rxjs.dev/api/index/class/Subject
import { Subject, takeUntil, combineLatest } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { RouteObject } from '../../models/route.model';
import { MAP_THEME } from '../../core/constants/map.constants';
import { LocationDataService } from '../../services/location-data.service';
import { LocationPoint } from '../../models/location.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { RoutingService } from '../../services/routing/routing.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, GlobalSearchComponent],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
})
export class MapViewComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private destroy$ = new Subject<void>();

  private currentLayerGroup!: L.LayerGroup;
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
  ) {}

  ngOnInit() {
    this.initMap();

    combineLatest([
      this.stateService.settings$,
      this.stateService.searchTerm$,
      this.stateService.mapMode$,
      this.stateService.selectedRoute$,
      this.locationDataService.parks$,
      this.locationDataService.states$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([settings, searchTerm, mapMode, selectedRoute, parks, states]) => {
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
            .map((v) => settings.familyMembers.find((m) => m.id === v.memberId))
            .filter(Boolean) as any[]; // keep full member object to render nice list
          return { ...p, visited: visitDetails.length > 0, visitedByMembers: visitors };
        });

        const mergedStates = states.map((s) => {
          const originalId = s.id.replace('state-', '');
          const visitDetails = settings.visitedStates?.[originalId] || [];
          const visitors = visitDetails
            .map((v) => settings.familyMembers.find((m) => m.id === v.memberId))
            .filter(Boolean) as any[]; // keep full member object
          return { ...s, visited: visitDetails.length > 0, visitedByMembers: visitors };
        });

        this.allLocations = [...mergedParks, ...mergedStates, ...hometowns];

        this.filterMarkers(this.currentSearchTerm);

        if (this.map) {
          setTimeout(() => {
            if (!this.map || typeof this.map.invalidateSize !== 'function') return;
            this.map.invalidateSize();
            const activeHometown =
              settings.hometowns.length > 0
                ? settings.hometowns[settings.hometowns.length - 1]
                : undefined;

            const showingAllRoutes =
              this.mapMode === 'roads' &&
              !selectedRoute &&
              settings.savedRoutes &&
              settings.savedRoutes.length > 0;
            if (activeHometown && !selectedRoute && !showingAllRoutes) {
              const bounds = L.circle([activeHometown.lat, activeHometown.lng], {
                radius: 321868,
              }).getBounds();
              this.map.fitBounds(bounds);
            }
          }, 100);
        }

        this.renderRoutes(settings.savedRoutes, selectedRoute, settings.routeReduction);
      });
  }

  private initMap() {
    L.Icon.Default.imagePath = 'leaflet/';
    const mapContainer = this.el.nativeElement.querySelector('#map');
    this.map = L.map(mapContainer).setView([39.8283, -98.5795], 4);

    L.tileLayer(API_ENDPOINTS.OSM_TILE_LAYER, {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
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
      const iconChar = isPark ? '🌲' : '★';
      const iconSize = isPark ? '16px' : '14px';
      const color = m.visited ? '#22c55e' : '#94a3b8'; // Green if visited, slate if unvisited

      let popupHtml = '';
      if (m.id.startsWith('hometown-')) {
        popupHtml = `<strong>${m.name} (${m.isLast ? 'Hometown' : 'Previous Hometown'})</strong>`;
      } else {
        const subLabel = isPark ? 'National Park' : 'State / Province';
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(m.name).replace(/%20/g, '_')}`;
        const originalId = m.id.replace('park-', '').replace('state-', '');

        const allMembers = this.familyMembers;
        const membersHtml = allMembers
          .map((member: any) => {
            const hasVisited = m.visitedByMembers?.some((v: any) => v.id === member.id);
            let visitText = 'No';

            if (hasVisited) {
              const visitObj = m.visitedByMembers.find((v: any) => v.id === member.id);
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

        popupHtml = `
            <div style="font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; min-width: 240px; padding: 4px;">
                <strong style="font-size: 14px; display: block; color: #292524;">${m.name}</strong>
                <span style="font-size: 12px; color: #78716c; display: block; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; margin-bottom: 4px;">${subLabel}</span>
                
                <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; margin-bottom: 8px;">
                    ${membersHtml}
                </div>

                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f5f5f4; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <a href="${wikiUrl}" target="_blank" style="font-size: 12px; color: #3b82f6; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line></svg>
                        Wikipedia
                    </a>
                    <button class="edit-location-btn" data-id="${originalId}" data-mode="${isPark ? 'parks' : 'states'}" style="font-size: 10px; color: #15803d; font-weight: bold; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                        ✏️ Edit
                    </button>
                </div>
            </div>
        `;
      }

      if (m.id.startsWith('hometown-')) {
        const htColor = m.isLast ? '#3b82f6' : '#9ca3af';
        const iconHtml = `<div class="flex items-center justify-center transition-all duration-300" style="width:32px; height:32px; background-color:${htColor}; border-radius:50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size:18px;">🏠</div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -20],
        });

        L.marker([m.lat, m.lng], { icon, zIndexOffset: m.isLast ? 1000 : 800 })
          .bindPopup(`<strong>${m.name} (${m.isLast ? 'Hometown' : 'Previous Hometown'})</strong>`)
          .addTo(this.currentLayerGroup);
      } else {
        const iconHtml = `<div class="flex items-center justify-center transition-all duration-300" style="width:24px; height:24px; background-color:${color}; border-radius:50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size:${iconSize}; color: white; line-height: 1;">${iconChar}</div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'bg-transparent border-none',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        });
        L.marker([m.lat, m.lng], { icon }).bindPopup(popupHtml).addTo(this.currentLayerGroup);
      }
    });
  }

  private async renderRoutes(
    savedRoutes: RouteObject[] = [],
    selectedRoute: RouteObject | null,
    routeReduction: number = 0.01,
  ) {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];

    if (selectedRoute) {
      let coords = selectedRoute.coordinates || this.routeCoordinatesCache[selectedRoute.timestamp];
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
          console.error('Failed to fetch route for selected route', e);
        }
      }

      if (coords && coords.length > 0) {
        // Render only the selected route
        const polyline = L.polyline(coords, {
          color: MAP_THEME.ROUTE_POLYLINE_COLOR,
          weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
          opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
        }).addTo(this.map);
        this.currentPolylines.push(polyline);
        this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    } else if (this.mapMode === 'roads' && savedRoutes && savedRoutes.length > 0) {
      // Render all routes if mode is roads
      await Promise.all(
        savedRoutes.map(async (route) => {
          let coords = route.coordinates || this.routeCoordinatesCache[route.timestamp];
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
              console.error('Failed to fetch route for', route.name, e);
            }
          }

          if (coords && coords.length > 0) {
            const isPlanned = route.status === 'planned';
            const polyline = L.polyline(coords, {
              color: isPlanned ? '#3b82f6' : '#22c55e', // blue for planned, green for completed
              weight: 4,
              opacity: 0.9,
            }).addTo(this.map);
            this.currentPolylines.push(polyline);
          }
        }),
      );

      // Optionally fit bounds to all routes
      if (this.currentPolylines.length > 0) {
        const group = new L.FeatureGroup(this.currentPolylines);
        this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
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
    if (this.map) {
      this.map.remove();
    }
  }
}
