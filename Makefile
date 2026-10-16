.PHONY: help install dev build build-local build-action test test-e2e lint lint-skills lint-rules lint-prose format format-check audit pre-commit pre-push clean run-old run-new generate-env repchecks repo-checks check check-deps check-links

-include .env
export

help:
	@echo "Available commands:"
	@echo "  make repchecks    - Run all repository checks (format, lint, rules, skills, deps, tests)"
	@echo "  make install      - Install npm dependencies"
	@echo "  make dev          - Start Angular development server on http://localhost:4200"
	@echo "  make build        - Build Angular application for production"
	@echo "  make build-local  - Build Angular application with root base-href"
	@echo "  make test         - Run Vitest unit test suite"
	@echo "  make test-e2e     - Run headless Playwright E2E test suite"
	@echo "  make lint         - Run ESLint across src/"
	@echo "  make lint-rules   - Scan source code using ast-grep structural rules"
	@echo "  make lint-skills  - Validate .agents/ and specs/ with agnix and skill safety scanner"
	@echo "  make lint-prose   - Check markdown prose with Vale and ai-tells"
	@echo "  make format       - Format code and docs using Prettier"
	@echo "  make format-check - Check formatting using Prettier without writing"
	@echo "  make audit        - Run npm audit vulnerability check"
	@echo "  make pre-commit   - Execute pre-commit validation gates (runs repchecks)"
	@echo "  make pre-push     - Execute Vitest pre-push verification gate"
	@echo "  make clean        - Clean dist/ and .angular/cache/"

# Generate environment files dynamically
generate-env:
	@node scripts/generate-env.js

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
	CI=true HOME=$$(pwd)/scratch NG_CLI_ANALYTICS=false npm test -- --watch=false

# Run Playwright E2E tests
test-e2e:
	npx playwright test

# Run ESLint across the source code
lint:
	npm run lint

# Scan code using ast-grep structural rules
lint-rules:
	ast-grep scan src/

# Lint skills and specs with agnix and safety scanner
lint-skills:
	@if command -v agnix >/dev/null 2>&1; then agnix validate .agents/; fi
	node scripts/scan-skills-safety.js .agents specs

# Check markdown prose with Vale and ai-tells
lint-prose:
	@if command -v vale >/dev/null 2>&1 && [ -d .vale/styles ]; then vale --minAlertLevel error README.md AGENTS.md developer.md architecture.md architecture/ || echo "⚠️ Vale prose suggestions reported above."; fi

# Format code and markdown using Prettier
format:
	npx prettier --write "src/**/*.{ts,html,css}" "scripts/**/*.js" "*.{ts,js,json,md,yml}" ".agents/**/*.{md,yml,json}" "architecture/**/*.md"

# Check formatting without modifying files
format-check:
	npx prettier --check "src/**/*.{ts,html,css}" "scripts/**/*.js" "*.{ts,js,json,md,yml}" ".agents/**/*.{md,yml,json}" "architecture/**/*.md"

# Run npm audit vulnerability check
audit:
	npm audit --audit-level=high

# Run all repository checks: formatting, linting, ast-grep rules, skills, pinned dependencies, project-relative links, and unit tests
repchecks: format-check lint lint-rules lint-skills check-deps check-links test
repo-checks: repchecks
check: repchecks

# Check that dependencies in package.json do not use unpinned "latest" or "*"
check-deps:
	@if grep -E ':\s*"(latest|\*)"' package.json > /dev/null; then \
		echo "❌ Unpinned dependency detected in package.json ('latest' or '*'). Pin exact versions per AGENTS.md Rule 6."; \
		exit 1; \
	fi

# Validate that all Markdown links are project-relative and not machine-relative
check-links:
	node scripts/check-markdown-links.js

# Execute pre-commit hook manually (runs repchecks)
pre-commit:
	bash .husky/pre-commit

# Execute pre-push hook manually
pre-push:
	bash .husky/pre-push

# Clean build output and cache
clean:
	rm -rf dist/
	rm -rf .angular/cache/
