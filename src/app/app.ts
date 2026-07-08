import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MapViewComponent } from './components/map-view/map-view.component';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { LocalStorageService } from './services/local-storage.service';
import { SettingsModal } from './components/settings-modal/settings-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MapViewComponent, GlobalSearchComponent, SettingsModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  showSettingsModal = false;

  // We inject LocalStorageService here to ensure it's instantiated immediately
  // upon application startup. This guarantees the initial state load.
  constructor(private localStorageService: LocalStorageService) {}

  ngOnInit() {}
}
