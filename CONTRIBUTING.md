# Contributing to Gestão Scouter

Thank you for your interest in contributing to Gestão Scouter! This document provides guidelines and information about our development workflow.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [GitHub Actions Workflow](#github-actions-workflow)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Code Style](#code-style)

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- Supabase account (for database access)
- Git

### Local Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/gestao-scouter.git
cd gestao-scouter

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm run dev

# 5. Build for production (verify your changes)
npm run build
```

### Required Environment Variables

For local development, you need:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_key
```

For synchronization features (optional):

```env
TABULADOR_URL=https://tabulador_project.supabase.co
TABULADOR_SERVICE_KEY=your_tabulador_key
```

## 🔄 Making Changes

### Branch Naming Convention

- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`
- Hotfix: `hotfix/description`

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new dashboard widget
fix: resolve data sync issue
docs: update API documentation
chore: update dependencies
test: add SQL migration tests
```

## 📝 Pull Request Process

### Before Submitting a PR

1. **Test locally**: Run `npm run build` to ensure the build succeeds
2. **Check linting**: Run `npm run lint` to identify code style issues
3. **Review changes**: Ensure only relevant files are included
4. **Update documentation**: If you changed functionality, update relevant docs

### PR Checklist

- [ ] Code builds successfully (`npm run build`)
- [ ] Linter passes with no errors (`npm run lint`)
- [ ] Database migrations are tested (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Changes are minimal and focused on the issue
- [ ] Commit messages follow convention

### Creating a Pull Request

1. Push your branch to your fork
2. Open a Pull Request against the `main` branch
3. Fill in the PR template with:
   - Description of changes
   - Related issue number (if applicable)
   - Testing performed
   - Screenshots (for UI changes)

## 🤖 GitHub Actions Workflow

### Overview

Every Pull Request to `main` automatically triggers our CI/CD workflow which validates:

1. **Database Migrations**: Applies all SQL migrations to a temporary PostgreSQL database
2. **SQL Tests**: Runs all test files in `supabase/tests/*.sql`
3. **Frontend Build**: Installs dependencies and builds the frontend application

### Workflow Jobs

#### Job 1: setup-database

- Starts a PostgreSQL 15 container (using Supabase's Postgres image)
- Installs required extensions (`uuid-ossp`, `pg_stat_statements`)
- Applies all migration files from `supabase/migrations/*.sql` in order
- Verifies the database schema is properly created

#### Job 2: run-sql-tests

- Sets up a fresh PostgreSQL instance
- Applies all migrations
- Runs all SQL test files from `supabase/tests/*.sql`
- Reports test results (pass/fail counts)

#### Job 3: frontend-build

- Sets up Node.js 18 environment
- Installs dependencies with `npm ci`
- Runs ESLint for code quality
- Builds the frontend with `npm run build`
- Verifies the `dist/` directory was created

### Required Repository Secrets

For the workflow to run with cloud database features, configure these secrets in your repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Optional* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Optional* |

> **\*Note**: These secrets are **optional** for the current workflow. The workflow uses a local PostgreSQL container for testing migrations and doesn't require cloud access. However, you may need them for future enhancements like deployment or integration tests.

### Workflow Triggers

The workflow runs on:

- **Pull Requests** to the `main` branch (automatic)
- **Pushes** to the `main` branch (after merge)
- **Manual trigger** via GitHub Actions UI (workflow_dispatch)

### Viewing Workflow Results

1. Go to your Pull Request
2. Scroll to the "Checks" section at the bottom
3. Click on "Migrations and Tests" to view details
4. Each job shows detailed logs and step-by-step execution

### Troubleshooting Failed Workflows

#### Migration Failures

If the `setup-database` job fails:

1. Check the workflow logs for the specific migration file that failed
2. Review the migration SQL for syntax errors or missing dependencies
3. Test the migration locally against a PostgreSQL database
4. Ensure migrations are numbered correctly and in order

#### SQL Test Failures

If the `run-sql-tests` job fails:

1. Review the test output to see which test failed
2. Verify the test expectations match the actual schema
3. Run the test locally: `psql -f supabase/tests/test_name.sql`
4. Update the test or fix the migrations accordingly

#### Build Failures

If the `frontend-build` job fails:

1. Run `npm run build` locally to reproduce the error
2. Check for TypeScript errors or missing dependencies
3. Ensure all environment variables are properly referenced
4. Review the build logs for specific error messages

## 💾 Database Migrations

### Creating a New Migration

Migrations should be created with a timestamp prefix and descriptive name:

```bash
# Format: YYYYMMDD_HHMMSS_description.sql
# Example:
supabase/migrations/20251025_143000_add_user_preferences.sql
```

### Migration Best Practices

1. **One change per migration**: Keep migrations focused and atomic
2. **Idempotent operations**: Use `IF NOT EXISTS` clauses where appropriate
3. **Rollback plan**: Document how to reverse the migration if needed
4. **Test locally first**: Apply migration to a test database before committing
5. **Data safety**: Use transactions and verify data integrity

### Example Migration

```sql
-- Migration: Add user preferences table
-- Created: 2025-10-25
-- Description: Stores user-specific settings and preferences

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON public.user_preferences(user_id);

-- Add RLS policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

COMMIT;
```

## 🧪 Testing

### SQL Tests

SQL tests are stored in `supabase/tests/` and run automatically in the CI workflow.

#### Creating SQL Tests

1. Create a new file in `supabase/tests/` with a numeric prefix:
   ```
   supabase/tests/03_test_user_permissions.sql
   ```

2. Use PL/pgSQL to write assertions:
   ```sql
   -- Test: User Permissions
   
   DO $$
   BEGIN
     -- Your test logic here
     IF NOT EXISTS (SELECT 1 FROM ...) THEN
       RAISE EXCEPTION 'Test failed: ...';
     END IF;
     
     RAISE NOTICE 'Test PASSED: ...';
   END $$;
   ```

3. Run the test locally:
   ```bash
   psql -f supabase/tests/03_test_user_permissions.sql
   ```

#### Test Guidelines

- **Clear test names**: Use descriptive names that explain what is being tested
- **Informative output**: Use `RAISE NOTICE` for passed tests
- **Fail explicitly**: Use `RAISE EXCEPTION` for failures with clear messages
- **Clean up**: Drop temporary tables and data after tests
- **Independent tests**: Each test should work independently of others

### Frontend Tests

Currently, the project uses manual testing in development mode. Future test infrastructure may include:

- **Unit Tests**: Vitest for utility functions and hooks
- **Component Tests**: React Testing Library for UI components
- **E2E Tests**: Playwright for critical user journeys

## 🎨 Code Style

### TypeScript Guidelines

- Use **strict TypeScript** - avoid `any` types
- Define proper interfaces for all data structures
- Use explicit return types for functions
- Enable and fix linting errors

### React Best Practices

- Use **functional components** with hooks
- Extract reusable logic into custom hooks
- Implement proper error boundaries
- Use React Query for server state management

### File Naming

- **Components**: PascalCase (`DashboardHeader.tsx`)
- **Utilities**: camelCase (`dateUtils.ts`)
- **Services**: camelCase with suffix (`bitrixService.ts`)
- **Constants**: UPPER_SNAKE_CASE

### Imports

Use absolute imports with the `@/` prefix:

```typescript
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
```

## 📚 Additional Resources

- [Project README](./README.md) - Overview and setup instructions
- [Architecture Documentation](./ARCHITECTURE_DIAGRAM.md) - System architecture
- [Sync Architecture](./SYNC_ARCHITECTURE_GESTAO_SCOUTER.md) - Data synchronization
- [CSV Import Guide](./CSV_IMPORT_GUIDE.md) - Data import instructions

## 🤝 Code Review

All pull requests require review before merging. Reviewers will check for:

- Code quality and adherence to style guidelines
- Test coverage and validation
- Documentation completeness
- Security considerations
- Performance implications

## 📞 Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the `/docs` directory for guides

---

Thank you for contributing to Gestão Scouter! 🎉
