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
  availableThemes = AVAILABLE_THEMES_LIST;
  currentThemeId: ColorThemeId = DEFAULT_THEME_ID;
  @ViewChild('profileMenuRef') profileMenuRef?: ElementRef;
  @ViewChild('themeMenuRef') themeMenuRef?: ElementRef;
  @ViewChild('mapView') mapView?: MapViewComponent;
  currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];

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
    } else {
      this.openParksModal();
    }
  }

  getSmartAddLabel(mode: MapMode): string {
    switch (mode) {
      case 'roads':
        return 'Add Roads';
      case 'states':
        return 'Add Regions';
      case 'parks':
        return 'Add Parks';
      case 'places':
      default:
        return 'Log Visits';
    }
  }

  getSmartAddTitle(mode: MapMode): string {
    switch (mode) {
      case 'roads':
        return 'Plan or add road trips and routes';
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
    this.mapView?.openRoads();
  }

  openParksModal(): void {
    this.mapView?.openParksModal();
  }

  openStatesModal(): void {
    this.mapView?.openStatesModal();
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
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
    if (this.showThemeMenu) {
      this.showThemeMenu = false;
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
