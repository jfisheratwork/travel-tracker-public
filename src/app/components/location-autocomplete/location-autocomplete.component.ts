import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { Waypoint } from '../../models/route.model';

@Component({
  selector: 'app-location-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-autocomplete.component.html'
})
export class LocationAutocompleteComponent implements OnInit, OnDestroy {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  
  @Input() query: string = '';
  @Output() queryChange = new EventEmitter<string>();

  suggestions: Waypoint[] = [];
  showDropdown = false;
  
  private searchSubject = new Subject<string>();
  private subscription?: Subscription;

  constructor(
    private geocodingService: GeocodingService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.subscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          return of([]);
        }
        return this.geocodingService.searchLocations(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      this.suggestions = results;
      this.showDropdown = this.suggestions.length > 0;
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onQueryChange(value: string) {
    this.query = value;
    this.queryChange.emit(this.query);
    this.searchSubject.next(value);
  }

  selectSuggestion(suggestion: Waypoint) {
    this.query = suggestion.name || '';
    this.queryChange.emit(this.query);
    this.showDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  onFocus() {
    if (this.suggestions.length > 0) {
      this.showDropdown = true;
    }
  }
}
