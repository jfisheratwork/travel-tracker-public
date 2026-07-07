import { Component } from '@angular/core';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { MapViewComponent } from './components/map-view/map-view.component';

@Component({
  selector: 'app-root',
  imports: [GlobalSearchComponent, MapViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
