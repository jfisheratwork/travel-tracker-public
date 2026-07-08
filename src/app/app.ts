import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapViewComponent } from './components/map-view/map-view.component';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { LocalStorageService } from './services/local-storage.service';
import { StateService } from './services/state.service';
import { SettingsModal } from './components/settings-modal/settings-modal';
import { RouteBuilderComponent } from './components/route-builder/route-builder';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';
import { LoadingSpinnerComponent } from './core/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MapViewComponent,
    GlobalSearchComponent,
    SettingsModal,
    RouteBuilderComponent,
    ToastContainerComponent,
    LoadingSpinnerComponent,
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
