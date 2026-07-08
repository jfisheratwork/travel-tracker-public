import { test, expect } from '@playwright/test';

test.describe('Road Trips & Route Builder', () => {

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    // Inject local storage state to force mapbox routing engine and a dummy key
    await page.addInitScript(() => {
      window.localStorage.setItem('np_travel_settings', JSON.stringify({
        routingEngine: 'mapbox',
        mapboxKey: 'test-key',
        savedRoutes: []
      }));
    });

    // Mock Geocoding
    await page.route('https://nominatim.openstreetmap.org/search*', async route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      let lat = '47.6588', lon = '-117.4260'; // Default Spokane
      
      if (query?.includes('Seattle')) {
        lat = '47.6062'; lon = '-122.3321';
      } else if (query?.includes('Radium')) {
        lat = '50.6197'; lon = '-116.0740';
      } else if (query?.includes('Cranbrook')) {
        lat = '49.5097'; lon = '-115.7656';
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([{ lat, lon, display_name: query }])
      });
    });

    await page.goto('/');
  });

  test('Scenario 1: Simple Route (Spokane to Seattle)', async ({ page }) => {
    // Mock routing
    await page.route('**/*driving/*', async route => {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          routes: [{
            distance: 450000, // meters
            duration: 16000,  // seconds
            geometry: { coordinates: [[-117.4260, 47.6588], [-122.3321, 47.6062]] }
          }]
        })
      });
    });

    await page.fill('input[placeholder="e.g. Summer West Coast Trip"]', 'test route to seattle');
    await page.fill('input[placeholder="e.g. Spokane, WA"]', 'Spokane, WA');
    await page.fill('input[placeholder="e.g. Seattle, WA"]', 'Seattle, WA');

    await page.click('button:has-text("Calculate Route")');

    // Should show Route Options
    await expect(page.locator('.option-card')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('.option-card')).toContainText('Option 1');

    await page.click('button:has-text("Save Trip")');

    // Should appear in saved routes
    const savedRoute = page.locator('.saved-route-card');
    await expect(savedRoute).toHaveCount(1);
    await expect(savedRoute).toContainText('test route to seattle');
  });

  test('Scenario 2: Simple Route with Likely Alt Route', async ({ page }) => {
    // Mock routing
    await page.route('**/*driving/*', async route => {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          routes: [
            {
              distance: 300000, duration: 12000,
              geometry: { coordinates: [[-117.4260, 47.6588], [-116.0740, 50.6197]] }
            },
            {
              distance: 320000, duration: 12500,
              geometry: { coordinates: [[-117.4260, 47.6588], [-115.0, 48.0], [-116.0740, 50.6197]] }
            }
          ]
        })
      });
    });

    await page.fill('input[placeholder="e.g. Summer West Coast Trip"]', 'Hot Springs Trip');
    await page.fill('input[placeholder="e.g. Spokane, WA"]', 'Spokane, WA');
    await page.fill('input[placeholder="e.g. Seattle, WA"]', 'Radium Hot Springs, BC');

    await page.click('button:has-text("Calculate Route")');

    // Should show 2 Route Options
    await expect(page.locator('.option-card')).toHaveCount(2, { timeout: 10000 });
    
    // Select the second option (via Eureka)
    await page.locator('.option-card').nth(1).click();
    await expect(page.locator('.option-card').nth(1)).toHaveClass(/selected/);

    await page.click('button:has-text("Save Trip")');
    
    const savedRoute = page.locator('.saved-route-card');
    await expect(savedRoute).toHaveCount(1);
    await expect(savedRoute).toContainText('Hot Springs Trip');
  });

  test('Scenario 3: Route with Waypoints (Cranbrook)', async ({ page }) => {
    // Mock routing
    await page.route('**/*driving/*', async route => {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          routes: [{
            distance: 400000, duration: 14000,
            geometry: { coordinates: [[-117.4260, 47.6588], [-115.7656, 49.5097], [-116.0740, 50.6197]] }
          }]
        })
      });
    });

    await page.fill('input[placeholder="e.g. Summer West Coast Trip"]', 'Trip with Stops');
    await page.fill('input[placeholder="e.g. Spokane, WA"]', 'Spokane, WA');
    await page.fill('input[placeholder="e.g. Seattle, WA"]', 'Radium Hot Springs, BC');

    await page.click('button:has-text("+ Add Stop")');
    await page.fill('input[placeholder="Stop Location"]', 'Cranbrook, BC');

    await page.click('button:has-text("Calculate Route")');
    await expect(page.locator('.option-card')).toHaveCount(1, { timeout: 10000 });

    await page.click('button:has-text("Save Trip")');
    await expect(page.locator('.saved-route-card')).toHaveCount(1);
  });

  test('Scenario 4: Edit and Delete Route', async ({ page }) => {
    // Pre-populate a saved route
    await page.addInitScript(() => {
      window.localStorage.setItem('np_travel_settings', JSON.stringify({
        routingEngine: 'osrm',
        savedRoutes: [{
          id: '123',
          name: 'My Old Route',
          description: '',
          status: 'planned',
          engine: 'osrm',
          distance: 100,
          duration: 100,
          timestamp: Date.now(),
          startQuery: 'A',
          endQuery: 'B',
          stopsQueries: [],
          waypoints: [],
          route: [],
          coordinates: []
        }]
      }));
    });
    
    // Reload to pick up the injected route
    await page.goto('/');

    await expect(page.locator('.saved-route-card')).toHaveCount(1);
    await expect(page.locator('.saved-route-card')).toContainText('My Old Route');

    // Click Edit
    await page.click('button:has-text("Edit")');
    
    // Check if form is populated
    await expect(page.locator('input[placeholder="e.g. Summer West Coast Trip"]')).toHaveValue('My Old Route');

    // Delete route
    await page.click('button:has-text("Delete")');
    await expect(page.locator('.saved-route-card')).toHaveCount(0);
    await expect(page.locator('.empty-state')).toBeVisible();
  });

});
