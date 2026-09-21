import { Component, ElementRef, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
// DOCS: https://angular.dev/guide/forms/reactive-forms
import { ReactiveFormsModule, FormControl } from '@angular/forms';
// DOCS: https://rxjs.dev/api/operators/debounceTime
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css'],
})
export class GlobalSearchComponent implements OnDestroy {
  @Input() forceExpanded = false;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  isExpanded = false;
  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  constructor(
    private stateService: StateService,
    private elementRef: ElementRef,
  ) {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.stateService.setSearchTerm(term || '');
      });
  }

  get showInput(): boolean {
    return this.forceExpanded || this.isExpanded || !!this.searchControl.value;
  }

  expand(): void {
    this.isExpanded = true;
    setTimeout(() => {
      this.searchInputRef?.nativeElement?.focus();
    });
  }

  collapse(): void {
    this.clearSearch();
    this.isExpanded = false;
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.forceExpanded) return;
    if (
      !this.elementRef.nativeElement.contains(event.target as Node) &&
      !this.searchControl.value
    ) {
      this.isExpanded = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
