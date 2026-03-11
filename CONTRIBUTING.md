# Contributing to GPC

Thanks for your interest in contributing to GPC! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yasserstudio/gpc.git
cd gpc

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
packages/
  cli/          # CLI entry point (bin: gpc)
  core/         # Business logic and orchestration
  api/          # Google Play Developer API client
  auth/         # Authentication strategies
  config/       # Configuration loading
  plugin-sdk/   # Plugin interface
plugins/
  plugin-ci/    # CI/CD helpers
```

## Development Workflow

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/api/add-subscription-endpoint
   ```

2. **Make your changes** in the relevant package(s).

3. **Run checks** before committing:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

4. **Create a changeset** (if your change affects published packages):

   ```bash
   pnpm changeset
   ```

5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):

   ```
   feat(api): add subscription listing endpoint
   fix(auth): handle expired refresh tokens
   docs(cli): update releases command examples
   ```

6. **Open a pull request** against `main`.

## Branch Naming

```
feat/<scope>/<short-desc>     # New feature
fix/<scope>/<short-desc>      # Bug fix
docs/<short-desc>             # Documentation
chore/<scope>/<short-desc>    # Maintenance
refactor/<scope>/<short-desc> # Code refactoring
test/<scope>/<short-desc>     # Test additions
```

Scopes: `cli`, `core`, `api`, `auth`, `config`, `plugin-sdk`, `ci`, `docs`

## Pull Request Guidelines

- One feature or fix per PR
- Include tests for new functionality
- Update documentation if needed
- PR title follows conventional commit format
- All CI checks must pass

## Testing

```bash
pnpm test                           # All tests
pnpm test --filter @gpc-cli/api         # Single package
pnpm test -- --watch                # Watch mode
```

## Code Style

- TypeScript strict mode
- ESM modules
- Named exports only (no default exports)
- See [Conventions](https://yasserstudio.github.io/gpc/advanced/conventions) for full details

## Need Help?

- Open a [Discussion](https://github.com/yasserstudio/gpc/discussions) for questions
- Check existing [Issues](https://github.com/yasserstudio/gpc/issues) before filing new ones
- See the [Architecture docs](https://yasserstudio.github.io/gpc/advanced/architecture) for design decisions
