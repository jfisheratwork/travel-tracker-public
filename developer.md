# Travel Tracker Developer Guide

Welcome to the Travel Tracker project! We've migrated to a modern Angular and TypeScript stack to ensure maintainability and robust cross-platform potential. 

This guide covers everything you need to know to build, test, and debug the application.

## 1. Getting Started

Before doing anything, ensure you have the required prerequisites:
- **Node.js**: The Javascript runtime. (Install via Homebrew: `brew install node`)
- **Angular CLI**: The command-line interface for Angular. (Install globally: `npm install -g @angular/cli`)

### Initial Setup
After cloning the repository, install the exact pinned versions of our dependencies:
```bash
npm install
```
*Note: Do not run `npm update` or manually change versions in `package.json` unless it complies with our "n-5 days since release" pinning policy.*

## 2. Build, Test, and Debug Flows

### Makefile Commands
For convenience, we provide a `Makefile` with common development commands:
- `make install` - Installs NPM dependencies.
- `make dev` - Starts the Angular dev server (same as `npm start`).
- `make build` - Compiles the app for production (using configured base paths).
- `make build-local` - Compiles the app for local HTTP serving, overriding base href to `/`.
- `make test` - Runs the Vitest test suite.
- `make lint` - Runs ESLint.
- `make format` - Runs Prettier to format source files.
- `make clean` - Cleans the `dist/` and `.angular/cache/` directories.


### Local Development Server
To run the app locally with Hot Module Replacement (HMR):
```bash
npm start
```
The application will be available at `http://localhost:4200`.

### Debugging
We have provided a `.vscode/launch.json` configuration for 1-click debugging in VS Code.
1. Run `npm start`.
2. Open the "Run and Debug" panel in VS Code.
3. Select "Launch Chrome against localhost" (or Edge) and hit the Play button.
You can now set breakpoints directly in your `.ts` files inside VS Code!

### Testing
We use **Vitest** for incredibly fast unit testing.
```bash
npm run test
```

### Production Build
To build the application for production deployment:
```bash
npm run build
```
The output will be placed in the `dist/travel-tracker-public/browser` directory.

## 3. Coding Guidelines & Strict Rules

### The Documentation Linking Rule
**CRITICAL:** The first time a specific Angular API, third-party library function, or new HTML element is used in a file, you **MUST** place a comment linking directly to its official documentation above it. 
This rule is strictly enforced to aid in learning and onboarding.

Example:
```typescript
// DOCS: https://angular.io/api/core/Component
@Component({
  standalone: true,
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent {
    // DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
    private state = new BehaviorSubject(null);
}
```

### Module Architecture: Standalone Components
We exclusively use Angular's **Standalone Components**. We do NOT use `NgModule` (`app.module.ts`).
Each component must explicitly declare its dependencies in its `@Component` decorator's `imports` array. This ensures easy-to-understand module boundaries.

### Scoped CSS
To reduce reliance on complex global CSS, style your components using standard `.css` files linked in the `styleUrls` array of your component.

---

## 4. State Management & RxJS

In our application, we use **RxJS** (Reactive Extensions for JavaScript) to manage global application state and handle asynchronous events. If you are new to RxJS, the core concept is the **Observable** — a stream of data that components can subscribe to over time.

### The Role of `BehaviorSubject`
In our `StateService` (e.g., line 16), we heavily rely on the `BehaviorSubject`. A `BehaviorSubject` is a special type of Observable that:
1. **Requires an initial value**: When instantiated, you must provide a default starting value (e.g., `new BehaviorSubject<RouteObject | null>(null)`).
2. **Remembers the current value**: It holds onto the latest value emitted. When a new component navigates into view and subscribes to it, that component will *immediately* receive the "current" value, rather than having to wait for a future update.
3. **Acts as both an Observer and Observable**: You can push new values into it using `.next(newValue)`, and you can subscribe to it to read values.

### How We Use It (e.g., `selectedRouteSubject`)
Here is the typical pattern used in our `StateService`:

```typescript
// 1. Private BehaviorSubject holds the actual mutable state.
private selectedRouteSubject = new BehaviorSubject<RouteObject | null>(null);

// 2. Public read-only Observable exposed to components. 
// The `$` suffix is a standard naming convention for Observables.
public readonly selectedRoute$ = this.selectedRouteSubject.asObservable();

// 3. Public setter method to update the state.
public setSelectedRoute(route: RouteObject | null): void {
  this.selectedRouteSubject.next(route);
}
```

**Why this pattern?**
- **Encapsulation**: Components cannot arbitrarily push data by calling `.next()` on `selectedRoute$`. They must use the designated `setSelectedRoute()` method. This ensures state changes are predictable.
- **Reactivity**: Any component that subscribes to `selectedRoute$` via the `async` pipe in HTML (e.g., `*ngIf="stateService.selectedRoute$ | async as route"`) will automatically re-render whenever `setSelectedRoute()` is called anywhere else in the app.

### Best Practices
- **Use the `async` pipe**: Subscribe to Observables directly in your HTML templates using `| async`. This automatically handles subscribing and **unsubscribing** when the component is destroyed, preventing memory leaks.
- **`firstValueFrom`**: If you just need a one-off result (like an HTTP API request), you can use `firstValueFrom(observable)` to convert the stream into a standard Promise for use with `async/await`.

---

## Appendix A: Learning Resources

If you are new to the stack, start here:

- **Angular Standalone Components:** [Getting started with Standalone Components](https://angular.io/guide/standalone-components)
- **RxJS (Reactive Extensions):** [Learn RxJS Basics](https://www.learnrxjs.io/) and specifically [BehaviorSubjects](https://rxjs.dev/api/index/class/BehaviorSubject)
- **TypeScript Strict Mode:** [Understanding strict type checking](https://www.typescriptlang.org/tsconfig#strict)
- **Vitest:** [Vitest Guide](https://vitest.dev/guide/)
- **Leaflet (Map Rendering):** [Leaflet Quick Start Guide](https://leafletjs.com/examples/quick-start/)

---
## Appendix B: OpenSpec Architecture
For detailed specifications on each individual component and the data layer, please refer to the markdown files in the `openspec/` directory at the root of this project.
