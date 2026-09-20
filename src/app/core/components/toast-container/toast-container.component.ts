// DOCS: https://angular.dev/api/core/Component
import { Component, inject } from '@angular/core';
// DOCS: https://angular.dev/api/common/CommonModule
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="toast-container"
      *ngIf="(toastService.toasts$ | async)?.length"
      role="region"
      aria-label="Alerts and Notifications"
    >
      <div
        *ngFor="let toast of toastService.toasts$ | async; trackBy: trackById"
        class="toast"
        [ngClass]="'toast-' + toast.type"
        role="alert"
      >
        <div class="toast-main">
          <span class="toast-icon" *ngIf="toast.type === 'error'" aria-hidden="true">⚠️</span>
          <span class="toast-icon" *ngIf="toast.type === 'success'" aria-hidden="true">✓</span>
          <span class="toast-icon" *ngIf="toast.type === 'info'" aria-hidden="true">ℹ️</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button
          type="button"
          class="toast-close-btn"
          (click)="toastService.removeToast(toast.id)"
          [attr.aria-label]="
            toast.type === 'error' ? 'Dismiss error notification' : 'Close notification'
          "
        >
          &times;
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 70vw;
        max-width: 1000px;
        min-width: 320px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        pointer-events: none;
      }
      .toast {
        width: 100%;
        pointer-events: auto;
        padding: 14px 20px;
        border-radius: 8px;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow:
          0 10px 25px -5px rgba(0, 0, 0, 0.3),
          0 8px 10px -6px rgba(0, 0, 0, 0.2);
        animation: dropFromTop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .toast-main {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.4;
        word-break: break-word;
      }
      .toast-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .toast-message {
        flex: 1;
      }
      .toast-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: #ffffff;
        font-size: 22px;
        cursor: pointer;
        padding: 2px 10px;
        border-radius: 6px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 16px;
        flex-shrink: 0;
        transition: all 0.15s ease-in-out;
      }
      .toast-close-btn:hover {
        background: rgba(255, 255, 255, 0.35);
        border-color: rgba(255, 255, 255, 0.7);
        transform: scale(1.05);
      }
      .toast-error {
        background-color: #dc2626; /* solid red block */
        border: 1px solid #b91c1c;
      }
      .toast-success {
        background-color: #059669; /* solid emerald block */
        border: 1px solid #047857;
      }
      .toast-info {
        background-color: #2563eb; /* solid blue block */
        border: 1px solid #1d4ed8;
      }
      @keyframes dropFromTop {
        from {
          transform: translateY(-120%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);

  public trackById(_index: number, toast: ToastMessage): string {
    return toast.id;
  }
}
