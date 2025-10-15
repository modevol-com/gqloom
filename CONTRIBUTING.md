# Contributing Guide

Thank you for your interest in GQLoom! We welcome all forms of contributions, including but not limited to:

- 🐛 Reporting Bugs
- 💡 Suggesting New Features
- 📝 Improving Documentation
- 🔧 Submitting Code Fixes or New Features

## Reporting Issues

If you find a bug or have a feature suggestion, please create a new issue on [GitHub Issues](https://github.com/modevol-com/gqloom/issues).

### Reporting Bugs

Please provide the following information:
- A detailed description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment information (Node.js version, operating system, etc.)
- If possible, provide a minimal reproducible example

### Feature Suggestions

Please describe:
- The purpose and use case of the feature
- Your desired API design
- Whether you are willing to contribute to its implementation

## Development Environment Setup

### Required Tools

Before you start, please ensure you have the following tools installed:

- **Git**: Version control tool
  - Official download: [https://git-scm.com/downloads](https://git-scm.com/downloads)

- **Node.js**: Node.js 20 or higher is recommended
  - Official download: [https://nodejs.org/](https://nodejs.org/)

### Optional Tools

- **Docker**: Only needed if you need to test MySQL or PostgreSQL functionality in the `@gqloom/drizzle` package
  - Official download: [https://www.docker.com/get-started](https://www.docker.com/get-started)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/modevol-com/gqloom.git
cd gqloom
```

### 2. Enable Corepack and Install Dependencies

First, enable Corepack to use the pnpm version specified by the project:

```bash
corepack enable
```

Then, install the dependencies:

```bash
pnpm install
```

### 3. Build the Project

```bash
pnpm build
```

This command will build all packages, ensuring that dependencies are correctly linked.

## Project Structure

GQLoom is a monorepo project. The main directory structure is as follows:

```
gqloom/
├── packages/         # Core packages
│   ├── core/         # Core functionality
│   ├── valibot/      # Valibot integration
│   ├── zod/          # Zod integration
│   ├── yup/          # Yup integration
│   ├── drizzle/      # Drizzle ORM integration
│   ├── prisma/       # Prisma integration
│   ├── mikro-orm/    # MikroORM integration
│   ├── federation/   # Apollo Federation support
│   └── json/         # JSON Schema integration
├── examples/         # Example projects
├── website/          # Documentation website
└── .github/          # GitHub Actions workflows
```

## Development Workflow

### Code Generation

If you are working with packages that require code generation (like `@gqloom/prisma`), you need to run the generate command after making changes. This is necessary before running tests or type checks.

```bash
pnpm -r run generate
```

### Running Tests

**Basic Tests**: In most cases, you only need to run:

```bash
pnpm test
```

**Testing Database Integration (Optional)**: You only need to start Docker containers if you are testing MySQL or PostgreSQL functionality in the `@gqloom/drizzle` package:

1. Start the Docker containers: `pnpm compose-up`
2. Create a `.env` file in the `packages/drizzle` directory with the following content:
   ```env
   MYSQL_URL=mysql://root@localhost:3306/mysql
   POSTGRESQL_URL=postgresql://postgres@localhost:5432/postgres
   ```
3. Initialize the database tables:
   ```bash
   pnpm push
   ```
4. Run the tests:
   ```bash
   pnpm test
   ```

> **Tip**: If you are only modifying other packages (like `@gqloom/valibot`, `@gqloom/zod`, etc.), you can skip the Docker-related steps.

**Test Coverage**: `pnpm coverage`

### Code Style

This project uses [Biome](https://biomejs.dev/) for code formatting and linting.

- **Format code**: `pnpm format`
- **Lint check**: `pnpm lint`
- **Fix automatically** (format + lint): `pnpm fix`
- **Full check** (lint + type check): `pnpm check`
- **Type check**: `pnpm check:type`

### Git Commits

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to ensure that committed code meets our standards.

When you run `git commit`, the following will be executed automatically:
- Code formatting
- Lint checks

If the checks fail, the commit will be blocked. Please fix the issues and try again.

## Submitting a Pull Request

### 1. Fork the Repository

First, fork this repository to your own account on GitHub.

### 2. Clone Your Fork

```bash
git clone https://github.com/your-username/gqloom.git
cd gqloom
```

Then, add the upstream repository to sync updates later:

```bash
git remote add upstream https://github.com/modevol-com/gqloom.git
```

### 3. Create a Branch

Create a new branch from `main`:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

We recommend using meaningful branch names:
- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation improvements
- `refactor/` for refactoring
- `test/` for test-related changes

### 4. Develop and Test

- Write your code
- Add or update tests
- Ensure all tests pass
- Ensure your code meets the style guidelines

### 3. Commit Your Changes

```bash
git add .
git commit -m "Describe your changes"
```

We recommend following this commit message format:
```
<type>(<scope>): <subject>

<body>
```

For example:
```
feat(json): Add support for Arktype

- Implement ArktypeWeaver
- Add unit tests
- Update documentation
```

Common types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

### 4. Push and Create a Pull Request

```bash
git push origin your-branch-name
```

Then, create a Pull Request on GitHub.

### Pull Request Checklist

Before submitting your PR, please ensure you have:

- [x] Passed the lint check (`pnpm lint`)
- [x] Passed the type check (`pnpm check:type`)
- [x] Passed all tests (`pnpm test`)
- [x] Added corresponding tests if you added new features
- [x] Updated the documentation if you modified a public API
- [x] Written a clear and descriptive commit message

---

Thank you again for your contribution! If you have any questions, feel free to ask in [GitHub Discussions](https://github.com/modevol-com/gqloom/discussions).
