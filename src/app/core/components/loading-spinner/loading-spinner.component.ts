import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isLoading$ | async"
      class="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"
      ></div>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  private stateService = inject(StateService);
  isLoading$ = this.stateService.isLoading$;
}
