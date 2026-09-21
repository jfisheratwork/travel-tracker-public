import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LocalStorageService } from './services/local-storage.service';
import { ToastService } from './core/services/toast.service';

describe('App', () => {
  let fixture: ComponentFixture<App> | null = null;
  let localStorageService: LocalStorageService;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule],
    }).compileComponents();

    localStorageService = TestBed.inject(LocalStorageService);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render map, search, and Try It Out button', async () => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-global-search')).toBeTruthy();
    expect(compiled.querySelector('app-map-view')).toBeTruthy();
    expect(compiled.querySelector('#tryItOutButton')).toBeTruthy();
    expect(compiled.querySelector('#tryItOutButton')?.textContent).toContain('Try It Out');
  });

  it('should load sample data successfully when Try It Out is clicked', async () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    vi.spyOn(localStorageService, 'loadSamplePreset').mockResolvedValue({
      success: true,
      message: 'Loaded',
    });
    vi.spyOn(localStorageService, 'markWelcomeDismissed');
    vi.spyOn(toastService, 'showSuccess');

    await app.loadTryItOutData();

    expect(localStorageService.loadSamplePreset).toHaveBeenCalledWith('family1.json');
    expect(localStorageService.markWelcomeDismissed).toHaveBeenCalled();
    expect(toastService.showSuccess).toHaveBeenCalledWith(
      'Sample data loaded! Have fun exploring.',
    );
    expect(app.isLoadingSample).toBe(false);
  });

  it('should show error toast when loading sample data fails', async () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    vi.spyOn(localStorageService, 'loadSamplePreset').mockResolvedValue({
      success: false,
      message: 'Failed to load',
    });
    vi.spyOn(toastService, 'showError');

    await app.loadTryItOutData();

    expect(toastService.showError).toHaveBeenCalled();
    expect(app.isLoadingSample).toBe(false);
  });

  it('should toggle mobile search visibility', () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.showMobileSearch).toBe(false);

    app.showMobileSearch = !app.showMobileSearch;
    expect(app.showMobileSearch).toBe(true);
  });

  it('should handle mode selection and return smart add labels and titles', () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.getSmartAddLabel('parks')).toBe('Add Parks');
    expect(app.getSmartAddLabel('states')).toBe('Add Regions');
    expect(app.getSmartAddLabel('roads')).toBe('Add Trip');
    expect(app.getSmartAddLabel('places')).toBe('Log Places Visited');

    expect(app.getSmartAddTitle('parks')).toContain('National Parks');
    expect(app.getSmartAddTitle('states')).toContain('states');

    const selectEvent = {
      target: { value: 'parks' },
    } as unknown as Event;
    const modeSpy = vi.spyOn(app.stateService, 'setMapMode');
    app.onModeSelectChange(selectEvent);
    expect(modeSpy).toHaveBeenCalledWith('parks');
  });

  it('should trigger correct modal on handleSmartAdd', () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const parksSpy = vi.spyOn(app, 'openParksModal').mockImplementation(() => {});
    const statesSpy = vi.spyOn(app, 'openStatesModal').mockImplementation(() => {});
    const roadsSpy = vi.spyOn(app, 'openRoads').mockImplementation(() => {});

    app.handleSmartAdd('parks');
    expect(parksSpy).toHaveBeenCalled();

    app.handleSmartAdd('states');
    expect(statesSpy).toHaveBeenCalled();

    app.handleSmartAdd('roads');
    expect(roadsSpy).toHaveBeenCalled();
  });

  it('should switch map mode to roads and trigger trip builder when openRoads is called', () => {
    fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const triggerSpy = vi.spyOn(app.stateService, 'triggerNewRoadTrip');
    const modeSpy = vi.spyOn(app.stateService, 'setMapMode');

    app.openRoads();
    expect(modeSpy).toHaveBeenCalledWith('roads');
    expect(triggerSpy).toHaveBeenCalled();
  });
});
