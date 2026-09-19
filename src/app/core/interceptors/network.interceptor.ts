import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, retry, catchError, finalize } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../services/logger.service';
import { ToastService } from '../services/toast.service';
import { StateService } from '../../services/state.service';
import { AppErrorType, AppErrorMessages } from '../models/app-error.model';

export const networkInterceptor: HttpInterceptorFn = (req, next) => {
  // Global overall timeout driven by environment config
  // Note: Standard browser HTTP APIs don't distinguish between connection and read timeouts.
  const TIMEOUT_MS = environment.networkTimeoutMs || 10000;
  const MAX_RETRIES = 2;
  const logger = inject(LoggerService);
  const toastService = inject(ToastService);
  const stateService = inject(StateService);

  stateService.setLoading(true);

  return next(req).pipe(
    timeout(TIMEOUT_MS),
    retry({
      count: MAX_RETRIES,
      delay: (error: HttpErrorResponse, retryCount) => {
        if (
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404
        ) {
          return throwError(() => error);
        }
        logger.warn(`Network request failed. Retrying... (${retryCount}/${MAX_RETRIES})`);
        return timer(1000 * retryCount);
      },
    }),
    catchError((error: unknown) => {
      logger.error('Network request failed permanently after retries.', error);

      let type = AppErrorType.UNKNOWN;
      const err = error as { name?: string; status?: number };

      if (err && err.name === 'TimeoutError') {
        type = AppErrorType.NETWORK_TIMEOUT;
      } else if (err && (err.status === 400 || err.status === 422)) {
        type = AppErrorType.VALIDATION_ERROR;
      } else if (err && (err.status === 401 || err.status === 403)) {
        type = AppErrorType.UNAUTHORIZED;
      } else if (err && err.status === 404) {
        type = AppErrorType.NOT_FOUND;
      } else if (err && err.status !== undefined && err.status >= 500) {
        type = AppErrorType.SERVER_ERROR;
      }

      const message = AppErrorMessages[type];
      const appError = { type, message, originalError: error };
      toastService.showError(appError);

      return throwError(() => appError);
    }),
    finalize(() => {
      stateService.setLoading(false);
    }),
  );
};
