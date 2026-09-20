import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToastService, ToastMessage } from './toast.service';
import { AppErrorType } from '../models/app-error.model';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ToastService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows error without auto-dismiss duration (requires explicit close)', () => {
    let latestToasts: ToastMessage[] = [];
    service.toasts$.subscribe((toasts) => (latestToasts = toasts));

    service.showError({
      type: AppErrorType.VALIDATION_ERROR,
      message: 'Failed to import trip.',
    });

    expect(latestToasts.length).toBe(1);
    expect(latestToasts[0].type).toBe('error');
    expect(latestToasts[0].message).toBe('Failed to import trip.');
    expect(latestToasts[0].duration).toBeUndefined();

    // Fast-forward 10 seconds - error MUST NOT disappear automatically
    vi.advanceTimersByTime(10000);
    expect(latestToasts.length).toBe(1);

    // Explicit user dismissal
    service.removeToast(latestToasts[0].id);
    expect(latestToasts.length).toBe(0);
  });

  it('shows success notification momentarily and auto-dismisses after 3500ms', () => {
    let latestToasts: ToastMessage[] = [];
    service.toasts$.subscribe((toasts) => (latestToasts = toasts));

    service.showSuccess('Trip imported successfully!');

    expect(latestToasts.length).toBe(1);
    expect(latestToasts[0].type).toBe('success');
    expect(latestToasts[0].duration).toBe(3500);

    // Fast-forward 3499ms: still visible
    vi.advanceTimersByTime(3499);
    expect(latestToasts.length).toBe(1);

    // Fast-forward past 3500ms: auto-dismissed
    vi.advanceTimersByTime(1);
    expect(latestToasts.length).toBe(0);
  });

  it('shows info notification momentarily and auto-dismisses after 3500ms', () => {
    let latestToasts: ToastMessage[] = [];
    service.toasts$.subscribe((toasts) => (latestToasts = toasts));

    service.showInfo('Review your trip details.');

    expect(latestToasts.length).toBe(1);
    expect(latestToasts[0].type).toBe('info');
    expect(latestToasts[0].duration).toBe(3500);

    vi.advanceTimersByTime(3500);
    expect(latestToasts.length).toBe(0);
  });
});
