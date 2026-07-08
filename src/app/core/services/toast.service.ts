import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppError } from '../models/app-error.model';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public readonly toasts$ = this.toastsSubject.asObservable();

  showError(error: AppError) {
    this.addToast({
      id: crypto.randomUUID(),
      type: 'error',
      message: error.message,
      duration: 5000,
    });
  }

  showSuccess(message: string) {
    this.addToast({
      id: crypto.randomUUID(),
      type: 'success',
      message,
      duration: 3000,
    });
  }

  showInfo(message: string) {
    this.addToast({
      id: crypto.randomUUID(),
      type: 'info',
      message,
      duration: 3000,
    });
  }

  removeToast(id: string) {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next(current.filter((t) => t.id !== id));
  }

  private addToast(toast: ToastMessage) {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next([...current, toast]);

    if (toast.duration) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration);
    }
  }
}
