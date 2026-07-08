import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { StateService } from '../../services/state.service';
// DOCS: https://rxjs.dev/api/index/class/Subject
import { Subject, takeUntil } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';

@Component({
  selector: 'app-map-view',
  standalone: true,
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
})
export class MapViewComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private destroy$ = new Subject<void>();

  // Dummy markers for demonstration. In a real app, these come from another service.
  private allMarkers: { lat: number; lng: number; title: string }[] = [
    { lat: 37.8651, lng: -119.5383, title: 'Yosemite' },
    { lat: 36.0544, lng: -112.1401, title: 'Grand Canyon' },
    { lat: 44.428, lng: -110.5885, title: 'Yellowstone' },
  ];
  private currentLayerGroup!: L.LayerGroup;

  constructor(
    private stateService: StateService,
    private el: ElementRef,
  ) {}

  ngOnInit() {
    this.initMap();

    this.stateService.searchTerm$.pipe(takeUntil(this.destroy$)).subscribe((term) => {
      this.filterMarkers(term);
    });
  }

  private initMap() {
    L.Icon.Default.imagePath = 'leaflet/';
    const mapContainer = this.el.nativeElement.querySelector('#map');
    this.map = L.map(mapContainer).setView([39.8283, -98.5795], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.currentLayerGroup = L.layerGroup().addTo(this.map);
  }

  private filterMarkers(term: string) {
    if (!this.map) return;

    this.currentLayerGroup.clearLayers();

    const lowerTerm = term.toLowerCase();
    const filtered = this.allMarkers.filter((m) => m.title.toLowerCase().includes(lowerTerm));

    filtered.forEach((m) => {
      L.marker([m.lat, m.lng]).bindPopup(m.title).addTo(this.currentLayerGroup);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }
}
