# Valuation OS

Multi-tenant valuation operations platform for estate surveying firms. The repo is a pnpm/Turborepo monorepo with:

- `apps/web`: Next.js web app for firm operations, admin, case handling, billing, and reporting
- `apps/mobile`: Expo mobile app for field and follow-up workflows
- `packages/types`: shared TypeScript contracts
- `packages/utils`: shared validators, formatters, and workflow rules
- `packages/api`: shared API client utilities

## Stack

- Next.js 15
- React 18
- Expo / React Native
- Prisma + PostgreSQL
- JWT auth with refresh tokens
- pnpm workspaces + Turborepo

## Local Setup

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install dependencies:

```bash
pnpm install
```

3. Generate the Prisma client and sync the database:

```bash
pnpm db:generate
pnpm db:push
```

4. Start the apps:

```bash
pnpm dev
```

Useful commands:

```bash
pnpm typecheck
pnpm -C apps/web typecheck
pnpm -C apps/mobile typecheck
pnpm -C packages/api typecheck
pnpm db:studio
```

## Environment

Important variables are defined in [.env.example](/Users/michaeladeleye/Documents/product/ERP Surveyors/.env.example):

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `NEXT_PUBLIC_APP_URL`

In production, JWT secrets must be explicitly configured. The app will not fall back to development secrets.

## Multi-Tenant Model

The hard security boundary is the firm.

- Every tenant-scoped record belongs to a `firmId`
- Authenticated API routes receive tenant context through [apps/web/lib/api/with-tenant.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/api/with-tenant.ts)
- Tenant-aware queries should use [apps/web/lib/db/tenant.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/db/tenant.ts) instead of raw Prisma where practical
- Cross-tenant foreign keys are validated before writes through ownership helpers in [apps/web/lib/db/ownership.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/db/ownership.ts)

## Branch Model

Branches are internal operating units inside a firm. They are not separate tenants.

- `firmId` remains the security boundary
- `branchId` is an operational scope inside the firm
- Managing partners are firm-wide and are not assigned to a branch
- Other staff roles are branch-related and should be assigned to a branch
- Branch-scoped users can only access branch-owned records in their assigned branch
- Managing partners can work across branches and optionally filter by branch

Branch/session policy is implemented in [apps/web/lib/auth/branch-scope.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/branch-scope.ts) and branch-aware JWT payloads are issued from [apps/web/lib/auth/session.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/session.ts).

## Current Branch-Aware UX

The following web screens now expose branch-aware behavior:

- Team management in [apps/web/app/(dashboard)/team/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/team/page.tsx)
- Case listing in [apps/web/app/(dashboard)/cases/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/cases/page.tsx)
- Case creation in [apps/web/app/(dashboard)/cases/new/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/cases/new/page.tsx)
- Dashboard summary in [apps/web/app/(dashboard)/dashboard/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/dashboard/page.tsx)
- Invoice listing in [apps/web/app/(dashboard)/invoices/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/invoices/page.tsx)
- Inspection listing in [apps/web/app/(dashboard)/inspections/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/inspections/page.tsx)

Shared branch filter UI lives in [apps/web/components/ui/branch-filter.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/ui/branch-filter.tsx).

## Authentication

- Access tokens are short-lived JWTs
- Refresh tokens are rotated and stored on the user record
- Login, signup, invite acceptance, and refresh all issue branch-aware access tokens
- Password policy is enforced server-side for signup, invite acceptance, password reset, and password change

Key auth files:

- [apps/web/lib/auth/session.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/session.ts)
- [apps/web/lib/auth/password.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/password.ts)
- [apps/web/lib/api/with-auth.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/api/with-auth.ts)

## Notes

- The repo currently has strong tenant and branch enforcement in the main operational modules, but some deeper case/report/inspection subroutes still rely on explicit firm checks instead of the newer `withTenant + req.db` pattern.
- Clients and properties remain tenant-level records. Cases and downstream operational records carry branch ownership today.
