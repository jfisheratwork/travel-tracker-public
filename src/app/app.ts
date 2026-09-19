import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapViewComponent } from './components/map-view/map-view.component';
import { LocalStorageService } from './services/local-storage.service';
import { StateService } from './services/state.service';
import { SettingsModal } from './components/settings-modal/settings-modal';
import { RouteBuilderComponent } from './components/route-builder/route-builder';
import { LocationsTrackerComponent } from './components/locations-tracker/locations-tracker';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';
import { LoadingSpinnerComponent } from './core/components/loading-spinner/loading-spinner.component';
import { LocationDetailModal } from './components/location-detail-modal/location-detail-modal';
import { WelcomeModalComponent } from './components/welcome-modal/welcome-modal.component';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  ColorThemeDefinition,
} from './core/constants/theme.constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MapViewComponent,
    SettingsModal,
    RouteBuilderComponent,
    LocationsTrackerComponent,
    ToastContainerComponent,
    LoadingSpinnerComponent,
    LocationDetailModal,
    WelcomeModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  showSettingsModal = false;
  showWelcomeModal = false;
  showDetailsDrawer = false;
  showProfileMenu = false;
  @ViewChild('profileMenuRef') profileMenuRef?: ElementRef;
  currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  toggleDetailsDrawer(): void {
    this.stateService.setDetailsDrawerOpen(!this.showDetailsDrawer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showProfileMenu && this.profileMenuRef?.nativeElement) {
      if (!this.profileMenuRef.nativeElement.contains(event.target as Node)) {
        this.showProfileMenu = false;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  // We inject LocalStorageService here to ensure it's instantiated immediately
  // upon application startup. This guarantees the initial state load.
  constructor(
    private localStorageService: LocalStorageService,
    public stateService: StateService,
  ) {}

  ngOnInit() {
    this.showWelcomeModal = this.localStorageService.isFirstVisitOrNoData();

    this.stateService.detailsDrawerOpen$.subscribe((isOpen) => {
      this.showDetailsDrawer = isOpen;
    });

    this.stateService.colorTheme$.subscribe((themeId) => {
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
