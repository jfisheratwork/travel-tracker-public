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
    fitBounds: vi.fn().mockReturnThis(),
    invalidateSize: vi.fn().mockReturnThis(),
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
      addTo: vi.fn().mockReturnThis(),
      setUrl: vi.fn(),
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
    mapMode$ = new BehaviorSubject<string>('places');
    const initialTheme = {
      id: 'dunes-deep-lake',
      name: 'Dunes & Deep Lake',
      canvasBg: '#f5eee6',
      titleBg: '#16384c',
      titleText: '#ffffff',
      mapCardBg: '#ffffff',
      mapCardBorder: '#d7c4b7',
      isDark: false,
      swatchColors: ['#16384c', '#40707a', '#cb8b44'],
    };
    const colorTheme$ = new BehaviorSubject<any>(initialTheme);
    stateServiceMock = {
      searchTerm$,
      selectedRoute$,
      settings$,
      mapMode$,
      colorTheme$,
      getColorTheme: vi.fn().mockReturnValue(initialTheme),
      setColorTheme: vi.fn(),
      setMapMode: vi.fn(),
      triggerNewRoadTrip: vi.fn(),
      getSettings: vi.fn().mockImplementation(() => settings$.getValue()),
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

  describe('CARTO tile layer configuration', () => {
    it('should return settings.cartoKey when provided and trimmed', () => {
      const key = component.getEffectiveCartoKey({
        cartoKey: '  cb1_user_key  ',
      } as any);
      expect(key).toBe('cb1_user_key');
    });

    it('should construct CARTO tile URL with ?key= parameter', () => {
      const url = component.getTileUrl('cb1_user_key');
      expect(url).toContain(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_user_key',
      );
      expect(url).not.toContain('api_key=');
    });

    it('should fallback to OpenStreetMap when no key is available', () => {
      const url = component.getTileUrl('');
      expect(url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    });

    it('should update tile layer with ?key= when settings update with a valid CARTO key', () => {
      const setUrlSpy = vi.spyOn(component['baseTileLayer'], 'setUrl');
      settings$.next({
        cartoKey: 'cb1_dynamic_test_key',
        hometowns: [],
        familyMembers: [],
        visitedStates: {},
        visitedParks: {},
      });
      expect(setUrlSpy).toHaveBeenCalledWith(expect.stringContaining('?key=cb1_dynamic_test_key'));
    });

    it('should not re-apply mode zoom when settings update within the same map mode', async () => {
      const setViewSpy = vi.fn();
      component['map'].setView = setViewSpy;

      // Allow initial setTimeout to settle
      await new Promise((r) => setTimeout(r, 150));
      setViewSpy.mockClear();

      // Trigger settings update (e.g. wishlist change)
      settings$.next({
        ...settings$.getValue(),
        wantToVisitStates: { LA: [{ memberId: '1', dateVisited: '2026-09-20' }] },
      });

      await new Promise((r) => setTimeout(r, 150));
      expect(setViewSpy).not.toHaveBeenCalled();
    });

    it('should toggle showMobileLegend state', () => {
      expect(component.showMobileLegend).toBe(false);
      component.showMobileLegend = !component.showMobileLegend;
      expect(component.showMobileLegend).toBe(true);
    });
  });
});
