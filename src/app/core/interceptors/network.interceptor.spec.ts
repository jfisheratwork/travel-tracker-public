import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { networkInterceptor } from './network.interceptor';
import { StateService } from '../../services/state.service';
import { ToastService } from '../services/toast.service';
import { LoggerService } from '../services/logger.service';

describe('networkInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let stateService: StateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([networkInterceptor])),
        provideHttpClientTesting(),
        StateService,
        {
          provide: ToastService,
          useValue: {
            showError: vi.fn(),
            showSuccess: vi.fn(),
            showInfo: vi.fn(),
            dismiss: vi.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    stateService = TestBed.inject(StateService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should toggle isLoading$ to true then false on successful request', () => {
    let emissions = 0;

    return new Promise<void>((resolve) => {
      stateService.isLoading$.subscribe((isLoading) => {
        if (emissions === 0) {
          expect(isLoading).toBe(false); // Initial state
        } else if (emissions === 1) {
          expect(isLoading).toBe(true); // After request started
        } else if (emissions === 2) {
          expect(isLoading).toBe(false); // After request finished
          resolve();
        }
        emissions++;
      });

      httpClient.get('/test-url').subscribe();

      const req = httpMock.expectOne('/test-url');
      req.flush({});
    });
  });
});
