import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { StateService } from '../../services/state.service';
// DOCS: https://rxjs.dev/api/index/class/Subject
import { Subject, takeUntil } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { RouteObject } from '../../models/route.model';
import { MAP_THEME } from '../../core/constants/map.constants';
import { LocationDataService } from '../../services/location-data.service';
import { LocationPoint } from '../../models/location.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

@Component({
  selector: 'app-map-view',
  standalone: true,
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
})
export class MapViewComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private destroy$ = new Subject<void>();

  private currentLayerGroup!: L.LayerGroup;
  private currentPolyline: L.Polyline | null = null;
  private allLocations: LocationPoint[] = [];
  private currentSearchTerm = '';

  constructor(
    private stateService: StateService,
    private locationDataService: LocationDataService,
    private el: ElementRef,
  ) {}

  ngOnInit() {
    this.initMap();

    this.stateService.searchTerm$.pipe(takeUntil(this.destroy$)).subscribe((term) => {
      this.currentSearchTerm = term;
      this.filterMarkers(term);
    });

    this.stateService.selectedRoute$.pipe(takeUntil(this.destroy$)).subscribe((route) => {
      this.renderRoute(route);
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

  private filterMarkers(term: string) {
    if (!this.map || !this.currentLayerGroup) return;

    this.currentLayerGroup.clearLayers();

    const lowerTerm = term.toLowerCase();
    const filtered = this.allLocations.filter((m) => m.name.toLowerCase().includes(lowerTerm));

    filtered.forEach((m) => {
      if (m.lat === 0 && m.lng === 0) return; // Skip if no coordinates

      const color = m.visited ? '#22c55e' : '#94a3b8'; // Green if visited, slate if unvisited
      const popupHtml = `
        <strong>${m.name}</strong><br>
        ${m.visited ? `Visited by: ${m.visitedBy.join(', ')}` : 'Not visited yet'}
      `;

      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(popupHtml)
        .addTo(this.currentLayerGroup);
    });
  }

  private renderRoute(route: RouteObject | null) {
    if (this.currentPolyline) {
      this.currentPolyline.remove();
      this.currentPolyline = null;
    }

    if (route && route.coordinates && route.coordinates.length > 0) {
      this.currentPolyline = L.polyline(route.coordinates, {
        color: MAP_THEME.ROUTE_POLYLINE_COLOR,
        weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
        opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
      }).addTo(this.map);

      this.map.fitBounds(this.currentPolyline.getBounds(), { padding: [50, 50] });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }
}
