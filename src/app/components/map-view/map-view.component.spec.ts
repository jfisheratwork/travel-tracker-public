/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapViewComponent } from './map-view.component';
import { StateService } from '../../services/state.service';
import { BehaviorSubject } from 'rxjs';
import * as L from 'leaflet';
import { vi } from 'vitest';
import { LocationDataService } from '../../services/location-data.service';

vi.mock('leaflet', () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn(),
    createPane: vi.fn().mockReturnValue({ style: {} }),
    getPane: vi.fn().mockReturnValue({ style: {} }),
  };
  return {
    Icon: {
      Default: {
        imagePath: '',
      },
    },
    map: vi.fn().mockReturnValue(mapInstance),
    tileLayer: vi.fn().mockReturnValue({
      addTo: vi.fn(),
    }),
    layerGroup: vi.fn().mockReturnValue({
      addTo: vi.fn().mockReturnValue({
        clearLayers: vi.fn(),
      }),
    }),
    divIcon: vi.fn().mockReturnValue({}),
    marker: vi.fn().mockReturnValue({
      bindPopup: vi.fn().mockReturnValue({
        addTo: vi.fn(),
      }),
    }),
    circleMarker: vi.fn().mockReturnValue({
      bindPopup: vi.fn().mockReturnValue({
        addTo: vi.fn(),
      }),
    }),
    latLng: vi.fn().mockReturnValue({
      toBounds: vi.fn().mockReturnValue({ isValid: vi.fn().mockReturnValue(true) }),
    }),
    circle: vi.fn().mockReturnValue({
      getBounds: vi.fn().mockReturnValue({ isValid: vi.fn().mockReturnValue(true) }),
    }),
    polyline: vi.fn().mockReturnValue({
      addTo: vi.fn().mockReturnThis(),
      bindTooltip: vi.fn().mockReturnThis(),
      getBounds: vi.fn().mockReturnValue({ isValid: vi.fn().mockReturnValue(true) }),
      remove: vi.fn(),
    }),
    geoJSON: vi.fn().mockReturnValue({
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }),
    FeatureGroup: vi.fn().mockReturnValue({
      getBounds: vi.fn().mockReturnValue({ isValid: vi.fn().mockReturnValue(true) }),
    }),
  };
});

describe('MapViewComponent', () => {
  let component: MapViewComponent;
  let fixture: ComponentFixture<MapViewComponent>;
  let stateServiceMock: any;
  let searchTerm$: BehaviorSubject<string>;
  let selectedRoute$: BehaviorSubject<any>;
  let settings$: BehaviorSubject<any>;
  let mapMode$: BehaviorSubject<string>;

  beforeEach(async () => {
    searchTerm$ = new BehaviorSubject<string>('');
    selectedRoute$ = new BehaviorSubject<any>(null);
    settings$ = new BehaviorSubject<any>({ hometowns: [] });
    mapMode$ = new BehaviorSubject<string>('parks');
    stateServiceMock = {
      searchTerm$,
      selectedRoute$,
      settings$,
      mapMode$,
      setMapMode: vi.fn(),
      triggerNewRoadTrip: vi.fn(),
    };

    const locationDataServiceMock = {
      parks$: new BehaviorSubject([]),
      states$: new BehaviorSubject([]),
      statesGeoJson$: new BehaviorSubject(null),
    };

    await TestBed.configureTestingModule({
      imports: [MapViewComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: LocationDataService, useValue: locationDataServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map on init', () => {
    expect(L.map).toHaveBeenCalled();
    expect(L.tileLayer).toHaveBeenCalled();
  });

  it('should correctly build dataStore map from settings and visitData', () => {
    // Test logic here
  });

  it('should call remove on map destroy', () => {
    component.ngOnDestroy();
    expect(component['map'].remove).toHaveBeenCalled();
  });
});
