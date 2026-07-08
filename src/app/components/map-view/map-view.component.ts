import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
// DOCS: https://rxjs.dev/api/index/class/Subject
import { Subject, takeUntil, combineLatest } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { RouteObject } from '../../models/route.model';
import { MAP_THEME } from '../../core/constants/map.constants';
import { LocationDataService } from '../../services/location-data.service';
import { LocationPoint } from '../../models/location.model';
import { AppSettings, Hometown } from '../../models/settings.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { RoutingService } from '../../services/routing/routing.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
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
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([settings, searchTerm, mapMode, selectedRoute]) => {
        this.currentSearchTerm = searchTerm.toLowerCase();
        this.mapMode = mapMode;

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
              // store whether it's the last one
              isLast: idx === settings.hometowns.length - 1,
            }) as any,
        );

        this.allLocations = [
          ...this.allLocations.filter((loc) => !loc.id.startsWith('hometown-')),
          ...hometowns,
        ];

        this.filterMarkers(this.currentSearchTerm);

        // Default zoom to active hometown
        if (this.map) {
          setTimeout(() => {
            if (!this.map || typeof this.map.invalidateSize !== 'function') return;
            this.map.invalidateSize();
            const activeHometown =
              settings.hometowns.length > 0
                ? settings.hometowns[settings.hometowns.length - 1]
                : undefined;

            // only fitBounds if we are NOT viewing a specific route, to prevent fighting
            const showingAllRoutes = this.mapMode === 'roads' && !selectedRoute && settings.savedRoutes && settings.savedRoutes.length > 0;
            if (activeHometown && !selectedRoute && !showingAllRoutes) {
              // 200 miles is roughly 321868 meters
              const bounds = L.circle([activeHometown.lat, activeHometown.lng], {
                radius: 321868,
              }).getBounds();
              this.map.fitBounds(bounds);
            }
          }, 100);
        }

        this.renderRoutes(settings.savedRoutes, selectedRoute, settings.routeReduction);
      });

    // Combine parks and states
    this.locationDataService.parks$.pipe(takeUntil(this.destroy$)).subscribe((parks) => {
      this.allLocations = [
        ...this.allLocations.filter((loc) => !loc.id.includes('park')),
        ...parks,
      ];
      this.filterMarkers(this.currentSearchTerm);
    });

    this.locationDataService.states$.pipe(takeUntil(this.destroy$)).subscribe((states) => {
      this.allLocations = [
        ...this.allLocations.filter((loc) => !loc.id.includes('state')),
        ...states,
      ];
      this.filterMarkers(this.currentSearchTerm);
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

      const color = m.visited ? '#22c55e' : '#94a3b8'; // Green if visited, slate if unvisited
      const popupHtml = `
        <strong>${m.name}</strong><br>
        ${m.visited ? 'Visited by: ' + m.visitedBy.join(', ') : 'Not visited yet'}
      `;

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
        L.circleMarker([m.lat, m.lng], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        })
          .bindPopup(popupHtml)
          .addTo(this.currentLayerGroup);
      }
    });
  }

  private async renderRoutes(savedRoutes: RouteObject[] = [], selectedRoute: RouteObject | null, routeReduction: number = 0.01) {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];

    if (selectedRoute) {
      let coords = selectedRoute.coordinates || this.routeCoordinatesCache[selectedRoute.timestamp];
      if (!coords && selectedRoute.waypoints && selectedRoute.waypoints.length > 0) {
        try {
          const options = await firstValueFrom(this.routingService.getRoutes(selectedRoute.engine, selectedRoute.waypoints));
          if (options && options.length > 0) {
            coords = this.reduceCoordinates(options[0].route, routeReduction);
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
      await Promise.all(savedRoutes.map(async (route) => {
        let coords = route.coordinates || this.routeCoordinatesCache[route.timestamp];
        if (!coords && route.waypoints && route.waypoints.length > 0) {
          try {
            const options = await firstValueFrom(this.routingService.getRoutes(route.engine, route.waypoints));
            if (options && options.length > 0) {
              coords = this.reduceCoordinates(options[0].route, routeReduction);
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
      }));

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
