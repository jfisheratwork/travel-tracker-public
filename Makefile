.PHONY: install dev build test lint format clean run-old run-new generate-env

-include .env
export

# Generate environment files dynamically
generate-env:
	@mkdir -p src/environments
	@printf "export const environment = {\n  production: false,\n  networkTimeoutMs: 10000,\n  mapboxKey:\n    '$$MAPBOX_API_KEY',\n  cartoKey: '$$CARTO_API_KEY',\n};\n" > src/environments/environment.ts


# Install all dependencies
install:
	npm install

# Start the local development server
dev: generate-env
	npm start

# Start the Angular development server and open in browser
run-new: generate-env
	npm start -- --open

# Start the legacy site (docs/) and open in browser
run-old:
	npx -y http-server docs -p 8082 -o


# Build the Angular application for production (using default angular.json baseHref if any)
build:
	HOME=$$(pwd)/scratch NG_CLI_ANALYTICS=false npm run build

# Build the Angular application for local HTTP serving (overriding base-href to root)
build-local:
	HOME=$$(pwd)/scratch NG_CLI_ANALYTICS=false npm run build -- --base-href /

# Simulate the GitHub action build
build-action: generate-env
	HOME=$$(pwd)/scratch NG_CLI_ANALYTICS=false npm run build -- --base-href /travel-tracker-public/newsite/
	@mkdir -p docs/newsite
	@rm -rf docs/newsite/*
	@cp -r dist/travel-tracker-public/browser/* docs/newsite/

# Run unit tests via Vitest
test:
	HOME=$$(pwd)/scratch NG_CLI_ANALYTICS=false npm test -- --watch=false

# Run ESLint across the source code
lint:
	npm run lint

# Format code using Prettier
format:
	npm run format

# Clean build output and cache
clean:
	rm -rf dist/
	rm -rf .angular/cache/
