import { Component, OnInit } from '@angular/core';
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
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  showSettingsModal = false;

  // We inject LocalStorageService here to ensure it's instantiated immediately
  // upon application startup. This guarantees the initial state load.
  constructor(
    private localStorageService: LocalStorageService,
    public stateService: StateService,
  ) {}

  ngOnInit() {}
}
