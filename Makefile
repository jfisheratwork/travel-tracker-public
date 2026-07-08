.PHONY: install dev build test lint format clean

# Install all dependencies
install:
	npm install

# Start the local development server
dev:
	npm start

# Build the Angular application for production (using default angular.json baseHref if any)
build:
	npm run build

# Build the Angular application for local HTTP serving (overriding base-href to root)
build-local:
	npm run build -- --base-href /

# Run unit tests via Vitest
test:
	npm test

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
