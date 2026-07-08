import { Component, OnDestroy } from '@angular/core';
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
  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  constructor(private stateService: StateService) {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.stateService.setSearchTerm(term || '');
      });
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
