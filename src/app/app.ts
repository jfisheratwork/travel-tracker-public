import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapViewComponent } from './components/map-view/map-view.component';
import { LocalStorageService } from './services/local-storage.service';
import { StateService } from './services/state.service';
import { SettingsModal } from './components/settings-modal/settings-modal';
import { StatsModal } from './components/stats-modal/stats-modal';
import { HelpModalComponent } from './components/help-modal/help-modal.component';
import { RouteBuilderComponent } from './components/route-builder/route-builder';
import { LocationsTrackerComponent } from './components/locations-tracker/locations-tracker';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';
import { LoadingSpinnerComponent } from './core/components/loading-spinner/loading-spinner.component';
import { LocationDetailModal } from './components/location-detail-modal/location-detail-modal';
import { WelcomeModalComponent } from './components/welcome-modal/welcome-modal.component';
import { AiTripModalComponent } from './components/ai-trip-modal/ai-trip-modal.component';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { MapMode } from './models/location.model';
import { ToastService } from './core/services/toast.service';
import { AppErrorType } from './core/models/app-error.model';
import { FormsModule } from '@angular/forms';
import { RouteObject } from './models/route.model';
import { PlaceFilterCategory } from './services/state.service';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  AVAILABLE_THEMES_LIST,
  ColorThemeId,
  ColorThemeDefinition,
} from './core/constants/theme.constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapViewComponent,
    GlobalSearchComponent,
    SettingsModal,
    StatsModal,
    HelpModalComponent,
    RouteBuilderComponent,
    LocationsTrackerComponent,
    ToastContainerComponent,
    LoadingSpinnerComponent,
    LocationDetailModal,
    WelcomeModalComponent,
    AiTripModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  showSettingsModal = false;
  showWelcomeModal = false;
  showStatsModal = false;
  showHelpModal = false;
  showAiTripModal = false;
  showThemeMenu = false;
  showDetailsDrawer = false;
  showProfileMenu = false;
  showPlacesFilterMenu = false;
  showTripsFilterMenu = false;
  tripSearchQuery = '';

  availableThemes = AVAILABLE_THEMES_LIST;
  currentThemeId: ColorThemeId = DEFAULT_THEME_ID;
  @ViewChild('profileMenuRef') profileMenuRef?: ElementRef;
  @ViewChild('themeMenuRef') themeMenuRef?: ElementRef;
  @ViewChild('placesFilterMenuRef') placesFilterMenuRef?: ElementRef;
  @ViewChild('tripsFilterMenuRef') tripsFilterMenuRef?: ElementRef;
  @ViewChild('mapView') mapView?: MapViewComponent;
  currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];

  placeFilterOptions: { key: PlaceFilterCategory; label: string; icon: string }[] = [
    { key: 'states', label: 'States & Regions', icon: '🏛️' },
    { key: 'national_parks', label: 'National Parks', icon: '⛰️' },
    { key: 'state_parks', label: 'State Parks', icon: '🌲' },
    { key: 'landmarks', label: 'Landmarks & Historic', icon: '🗽' },
    { key: 'theme_parks', label: 'Theme Parks', icon: '🎢' },
    { key: 'cities', label: 'Cities & Capitals', icon: '🏙️' },
    { key: 'custom', label: 'Custom Places', icon: '📍' },
  ];

  savedRoutes: RouteObject[] = [];
  selectedRoute: RouteObject | null = null;
  selectedRouteIds: string[] | null = null;

  togglePlacesFilterMenu(): void {
    this.showPlacesFilterMenu = !this.showPlacesFilterMenu;
    if (this.showPlacesFilterMenu) {
      this.showTripsFilterMenu = false;
      this.showProfileMenu = false;
      this.showThemeMenu = false;
    }
  }

  toggleTripsFilterMenu(): void {
    this.showTripsFilterMenu = !this.showTripsFilterMenu;
    if (this.showTripsFilterMenu) {
      this.showPlacesFilterMenu = false;
      this.showProfileMenu = false;
      this.showThemeMenu = false;
    }
  }

  isPlacesFilterActive(category: PlaceFilterCategory): boolean {
    return this.stateService.isPlacesFilterActive(category);
  }

  togglePlacesFilter(category: PlaceFilterCategory): void {
    this.stateService.togglePlacesFilter(category);
  }

  selectAllPlacesFilters(): void {
    this.stateService.selectAllPlacesFilters();
  }

  clearAllPlacesFilters(): void {
    this.stateService.clearAllPlacesFilters();
  }

  getPlacesFilterButtonLabel(): string {
    const active = this.stateService.getPlacesFilters();
    if (active.length === this.placeFilterOptions.length) {
      return 'All Places';
    }
    if (active.length === 0) {
      return 'None';
    }
    if (active.length === 1) {
      const match = this.placeFilterOptions.find((o) => o.key === active[0]);
      return match ? match.label : '1 Category';
    }
    return `${active.length} Categories`;
  }

  get filteredSavedRoutes(): RouteObject[] {
    const query = this.tripSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.savedRoutes;
    }
    return this.savedRoutes.filter((r) => {
      const matchName = r.name.toLowerCase().includes(query);
      const matchStart = r.startQuery?.toLowerCase().includes(query);
      const matchEnd = r.endQuery?.toLowerCase().includes(query);
      const matchStops = r.stopsQueries?.some((s) => s.toLowerCase().includes(query));
      return matchName || matchStart || matchEnd || matchStops;
    });
  }

  isAllTripsDrawn(): boolean {
    return !this.selectedRouteIds || this.selectedRouteIds.length === 0;
  }

  isTripSelected(route: RouteObject): boolean {
    const routeId = route.id || String(route.timestamp) || route.name;
    if (this.selectedRouteIds && this.selectedRouteIds.includes(routeId)) {
      return true;
    }
    if (!this.selectedRouteIds && this.selectedRoute) {
      return (
        (this.selectedRoute.id ||
          String(this.selectedRoute.timestamp) ||
          this.selectedRoute.name) === routeId
      );
    }
    return false;
  }

  drawAllTrips(): void {
    this.selectedRouteIds = null;
    this.selectedRoute = null;
    this.stateService.setSelectedRouteIds(null);
    this.stateService.setSelectedRoute(null);
    this.showTripsFilterMenu = false;
  }

  selectTrip(route: RouteObject): void {
    const routeId = route.id || String(route.timestamp) || route.name;
    this.selectedRouteIds = [routeId];
    this.selectedRoute = route;
    this.stateService.setSelectedRouteIds([routeId]);
    this.stateService.setSelectedRoute(route);
    this.showTripsFilterMenu = false;
  }

  toggleTripSelection(route: RouteObject): void {
    const routeId = route.id || String(route.timestamp) || route.name;
    let current = this.stateService.getSelectedRouteIds();
    if (!current) {
      this.stateService.setSelectedRouteIds([routeId]);
      this.stateService.setSelectedRoute(route);
    } else if (current.includes(routeId)) {
      current = current.filter((id) => id !== routeId);
      if (current.length === 0) {
        this.stateService.setSelectedRouteIds(null);
        this.stateService.setSelectedRoute(null);
      } else {
        this.stateService.setSelectedRouteIds(current);
        if (current.length === 1) {
          const singleId = current[0];
          const match = this.savedRoutes.find(
            (r) => (r.id || String(r.timestamp) || r.name) === singleId,
          );
          this.stateService.setSelectedRoute(match || null);
        } else {
          this.stateService.setSelectedRoute(null);
        }
      }
    } else {
      current = [...current, routeId];
      this.stateService.setSelectedRouteIds(current);
      if (current.length === 1) {
        this.stateService.setSelectedRoute(route);
      } else {
        this.stateService.setSelectedRoute(null);
      }
    }
  }

  getTripsFilterButtonLabel(): string {
    if (this.isAllTripsDrawn()) {
      return `All Trips (${this.savedRoutes.length})`;
    }
    if (this.selectedRouteIds && this.selectedRouteIds.length === 1) {
      const match = this.savedRoutes.find(
        (r) => (r.id || String(r.timestamp) || r.name) === this.selectedRouteIds![0],
      );
      return match ? match.name : '1 Trip';
    }
    if (this.selectedRouteIds) {
      return `${this.selectedRouteIds.length} Trips`;
    }
    return `All Trips (${this.savedRoutes.length})`;
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  toggleThemeMenu(): void {
    this.showThemeMenu = !this.showThemeMenu;
  }

  selectTheme(id: ColorThemeId): void {
    this.stateService.setColorTheme(id);
    this.showThemeMenu = false;
  }

  toggleDetailsDrawer(): void {
    this.stateService.setDetailsDrawerOpen(!this.showDetailsDrawer);
  }

  showMobileSearch = false;

  setMapMode(mode: MapMode): void {
    this.stateService.setMapMode(mode);
  }

  onModeSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select?.value) {
      this.setMapMode(select.value as MapMode);
    }
  }

  handleSmartAdd(mode: MapMode): void {
    if (mode === 'roads') {
      this.openRoads();
    } else if (mode === 'states') {
      this.openStatesModal();
    } else if (mode === 'parks') {
      this.openParksModal();
    } else {
      this.openPlacesModal();
    }
  }

  getSmartAddLabel(mode: MapMode): string {
    switch (mode) {
      case 'roads':
        return 'Add Trip';
      case 'states':
        return 'Add Regions';
      case 'parks':
        return 'Add Parks';
      case 'places':
      default:
        return 'Log Places Visited';
    }
  }

  getSmartAddTitle(mode: MapMode): string {
    switch (mode) {
      case 'roads':
        return 'Plan or add trips and routes';
      case 'states':
        return 'Log visited states and Canadian provinces';
      case 'parks':
        return 'Log visited US and Canadian National Parks';
      case 'places':
      default:
        return 'Log visited parks, regions, and places';
    }
  }

  openRoads(): void {
    this.setMapMode('roads');
    this.stateService.triggerNewRoadTrip();
  }

  openParksModal(): void {
    this.mapView?.openParksModal();
  }

  openStatesModal(): void {
    this.mapView?.openStatesModal();
  }

  openPlacesModal(): void {
    this.mapView?.openPlacesModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showProfileMenu && this.profileMenuRef?.nativeElement) {
      if (!this.profileMenuRef.nativeElement.contains(event.target as Node)) {
        this.showProfileMenu = false;
      }
    }
    if (this.showThemeMenu && this.themeMenuRef?.nativeElement) {
      if (!this.themeMenuRef.nativeElement.contains(event.target as Node)) {
        this.showThemeMenu = false;
      }
    }
    if (this.showPlacesFilterMenu && this.placesFilterMenuRef?.nativeElement) {
      if (!this.placesFilterMenuRef.nativeElement.contains(event.target as Node)) {
        this.showPlacesFilterMenu = false;
      }
    }
    if (this.showTripsFilterMenu && this.tripsFilterMenuRef?.nativeElement) {
      if (!this.tripsFilterMenuRef.nativeElement.contains(event.target as Node)) {
        this.showTripsFilterMenu = false;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
    if (this.showThemeMenu) {
      this.showThemeMenu = false;
    }
    if (this.showPlacesFilterMenu) {
      this.showPlacesFilterMenu = false;
    }
    if (this.showTripsFilterMenu) {
      this.showTripsFilterMenu = false;
    }
  }

  isLoadingSample = false;

  // We inject LocalStorageService here to ensure it's instantiated immediately
  // upon application startup. This guarantees the initial state load.
  constructor(
    private localStorageService: LocalStorageService,
    public stateService: StateService,
    private toastService: ToastService,
  ) {}

  async loadTryItOutData(): Promise<void> {
    if (this.isLoadingSample) return;
    this.isLoadingSample = true;
    try {
      const res = await this.localStorageService.loadSamplePreset('family1.json');
      if (res.success) {
        this.localStorageService.markWelcomeDismissed();
        this.showWelcomeModal = false;
        this.toastService.showSuccess('Sample data loaded! Have fun exploring.');
      } else {
        this.toastService.showError({
          type: AppErrorType.UNKNOWN,
          message: res.message || 'Could not load sample data.',
        });
      }
    } catch {
      this.toastService.showError({
        type: AppErrorType.UNKNOWN,
        message: 'Could not load sample data.',
      });
    } finally {
      this.isLoadingSample = false;
    }
  }

  ngOnInit() {
    this.showWelcomeModal = this.localStorageService.isFirstVisitOrNoData();

    this.stateService.settings$.subscribe((settings) => {
      this.savedRoutes = settings.savedRoutes || [];
    });

    this.stateService.selectedRoute$.subscribe((route) => {
      this.selectedRoute = route;
    });

    this.stateService.selectedRouteIds$.subscribe((ids) => {
      this.selectedRouteIds = ids;
    });

    this.stateService.detailsDrawerOpen$.subscribe((isOpen) => {
      this.showDetailsDrawer = isOpen;
      setTimeout(() => {
        this.mapView?.invalidateSize();
        if (isOpen && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          const drawer = document.getElementById('detailsDrawer');
          drawer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    });

    this.stateService.colorTheme$.subscribe((themeId) => {
      this.currentThemeId = themeId;
      this.currentTheme = COLOR_THEMES[themeId] || COLOR_THEMES[DEFAULT_THEME_ID];
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = this.currentTheme.canvasBg;
        document.body.style.fontFamily = this.currentTheme.fontFamily;
        document.documentElement.style.setProperty('--app-font', this.currentTheme.fontFamily);
        if (this.currentTheme.isDark) {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
      }
    });
  }
}
