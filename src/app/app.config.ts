// Core Angular Application Configuration and Error Handling
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// Angular Router Provider for application navigation
import { provideRouter } from '@angular/router';

// HTTP Client Provider and Interceptor Support for making network requests
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// Application Routes definitions
import { routes } from './app.routes';

// Global HTTP Network Interceptor (handles timeouts and retries)
import { networkInterceptor } from './core/interceptors/network.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([networkInterceptor])),
  ],
};
