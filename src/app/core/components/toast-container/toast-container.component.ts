import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toastService.toasts$ | async"
        class="toast"
        [ngClass]="'toast-' + toast.type"
      >
        <span>{{ toast.message }}</span>
        <button (click)="toastService.removeToast(toast.id)">&times;</button>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .toast {
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 250px;
        box-shadow:
          0 4px 6px -1px rgb(0 0 0 / 0.1),
          0 2px 4px -2px rgb(0 0 0 / 0.1);
        animation: slideIn 0.3s ease-out forwards;
      }
      .toast button {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 0 0 12px;
        line-height: 1;
      }
      .toast-error {
        background-color: #ef4444; /* red-500 */
      }
      .toast-success {
        background-color: #22c55e; /* green-500 */
      }
      .toast-info {
        background-color: #3b82f6; /* blue-500 */
      }
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);
}
