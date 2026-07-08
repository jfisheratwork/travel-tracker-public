import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapViewComponent } from './map-view.component';
import { StateService } from '../../services/state.service';
import { BehaviorSubject } from 'rxjs';
import * as L from 'leaflet';
import { vi } from 'vitest';

vi.mock('leaflet', () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
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
    marker: vi.fn().mockReturnValue({
      bindPopup: vi.fn().mockReturnValue({
        addTo: vi.fn(),
      }),
    }),
  };
});

describe('MapViewComponent', () => {
  let component: MapViewComponent;
  let fixture: ComponentFixture<MapViewComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateServiceMock: any;
  let searchTerm$: BehaviorSubject<string>;

  beforeEach(async () => {
    searchTerm$ = new BehaviorSubject<string>('');
    stateServiceMock = { searchTerm$ };

    await TestBed.configureTestingModule({
      imports: [MapViewComponent],
      providers: [{ provide: StateService, useValue: stateServiceMock }],
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
