// DOCS: https://angular.io/api/core/Injectable
import { Injectable } from '@angular/core';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
import { BehaviorSubject } from 'rxjs';

/**
 * OpenSpec: 01 LocalStorage & State Service
 * This is the reference implementation demonstrating strict doc links and reactive state.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  // State for the currently active tab in the UI
  private activeTabSubject = new BehaviorSubject<string>('parks');
  // DOCS: https://rxjs.dev/api/index/function/asObservable
  public activeTab$ = this.activeTabSubject.asObservable();

  // State for the global search term
  private searchTermSubject = new BehaviorSubject<string>('');
  public searchTerm$ = this.searchTermSubject.asObservable();

  constructor() {
    this.loadInitialState();
  }

  private loadInitialState(): void {
    // DOCS: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
    const savedSettings = localStorage.getItem('np_travel_settings');
    if (savedSettings) {
      try {
        // DOCS: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
        const parsed = JSON.parse(savedSettings);
        // We will expand on deserialization as per openspec later.
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }

  public setActiveTab(tab: string): void {
    this.activeTabSubject.next(tab);
  }

  public setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }
}
