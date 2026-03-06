.PHONY: install build dev test lint typecheck format clean release smoke

install:
	pnpm install

build:
	pnpm build

dev:
	pnpm dev

test:
	pnpm test

test-e2e:
	pnpm test --filter=e2e

lint:
	pnpm lint

typecheck:
	pnpm typecheck

format:
	pnpm format

format-check:
	pnpm format:check

clean:
	pnpm clean

release:
	pnpm release

smoke:
	cd packages/cli && node dist/bin.js --version
	cd packages/cli && node dist/bin.js doctor
