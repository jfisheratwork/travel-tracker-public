import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WelcomeModalComponent } from './welcome-modal.component';
import { StateService } from '../../services/state.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { of } from 'rxjs';

describe('WelcomeModalComponent', () => {
  let component: WelcomeModalComponent;
  let fixture: ComponentFixture<WelcomeModalComponent>;
  let stateService: StateService;
  let geocodingService: { searchLocations: ReturnType<typeof vi.fn> };
  let localStorageService: {
    loadSamplePreset: ReturnType<typeof vi.fn>;
    markWelcomeDismissed: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    geocodingService = {
      searchLocations: vi.fn().mockReturnValue(
        of([
          { name: 'Spokane, WA', lat: 47.6588, lng: -117.426 },
          { name: 'Spokane Valley, WA', lat: 47.6732, lng: -117.2394 },
        ]),
      ),
    };

    localStorageService = {
      loadSamplePreset: vi.fn().mockResolvedValue({ success: true, message: 'Loaded' }),
      markWelcomeDismissed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WelcomeModalComponent],
      providers: [
        StateService,
        { provide: GeocodingService, useValue: geocodingService },
        { provide: LocalStorageService, useValue: localStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeModalComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add individual family member', () => {
    component.memberNameInput = 'Alice';
    component.addFamilyMember();

    expect(component.familyMembers.length).toBe(1);
    expect(component.familyMembers[0].name).toBe('Alice');
    expect(component.memberNameInput).toBe('');
  });

  it('should parse and add comma-separated family members', () => {
    component.memberNameInput = 'Bob, Brittany, Ben, Becca, Brian';
    component.addFamilyMember();

    expect(component.familyMembers.length).toBe(5);
    expect(component.familyMembers.map((m) => m.name)).toEqual([
      'Bob',
      'Brittany',
      'Ben',
      'Becca',
      'Brian',
    ]);
  });

  it('should remove a family member by index', () => {
    component.memberNameInput = 'Bob, Lisa';
    component.addFamilyMember();
    expect(component.familyMembers.length).toBe(2);

    component.removeFamilyMember(0);
    expect(component.familyMembers.length).toBe(1);
    expect(component.familyMembers[0].name).toBe('Lisa');
  });

  it('should search and select home city', async () => {
    component.homeCityQuery = 'Spokane';
    await component.searchCity();

    expect(geocodingService.searchLocations).toHaveBeenCalledWith('Spokane', 5);
    expect(component.homeCitySearchResults.length).toBe(2);

    component.selectCity(component.homeCitySearchResults[0]);
    expect(component.homeCity).toEqual({
      name: 'Spokane, WA',
      lat: 47.6588,
      lng: -117.426,
    });
    expect(component.homeCitySearchResults.length).toBe(0);
  });

  it('should save settings, mark welcome dismissed, and emit close', async () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.memberNameInput = 'Jake, Lisa';
    component.addFamilyMember();
    component.homeCity = { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 };
    component.mapboxKeyInput = 'pk.testkey123';
    component.cartoKeyInput = 'cb1_testcarto';

    await component.saveAndStart();

    const saved = stateService.getSettings();
    expect(saved.familyMembers.length).toBe(2);
    expect(saved.hometowns.length).toBe(1);
    expect(saved.hometowns[0].name).toBe('Denver, CO');
    expect(saved.mapboxKey).toBe('pk.testkey123');
    expect(saved.cartoKey).toBe('cb1_testcarto');
    expect(saved.routingEngine).toBe('mapbox');

    expect(localStorageService.markWelcomeDismissed).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should skip, mark dismissed, and emit close', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.skip();

    expect(localStorageService.markWelcomeDismissed).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should load demo sample, mark dismissed, and emit close', async () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    await component.loadDemoSample();

    expect(localStorageService.loadSamplePreset).toHaveBeenCalled();
    expect(localStorageService.markWelcomeDismissed).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
