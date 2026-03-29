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
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_EAS_PROJECT_ID` for Expo push token registration on device builds

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

## Client Ownership

Clients are now branch-aware inside a firm.

- Every client still belongs to a `firmId`
- Clients also carry a `branchId` to represent the branch that owns the relationship
- Managing partners can create, view, and filter clients across branches
- Branch-scoped staff can only access clients in their assigned branch
- Case creation only offers clients that are visible to the current branch scope
- If only one branch is visible during client creation, it is preselected automatically

Client branch ownership is enforced in [apps/web/app/api/v1/clients/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/clients/route.ts), [apps/web/app/api/v1/clients/[id]/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/clients/[id]/route.ts), and the related client contact/case subroutes.

## Current Branch-Aware UX

The following web screens now expose branch-aware behavior:

- Team management in [apps/web/app/(dashboard)/team/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/team/page.tsx)
- Client listing in [apps/web/app/(dashboard)/clients/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/clients/page.tsx)
- Client creation in [apps/web/app/(dashboard)/clients/new/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/clients/new/page.tsx)
- Client detail in [apps/web/app/(dashboard)/clients/[id]/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/clients/[id]/page.tsx)
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

## Mobile Module A Coverage

The mobile app now covers the core Module A flows:

- Session-aware routing and tab protection in [apps/mobile/app/_layout.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/_layout.tsx)
- Login in [apps/mobile/app/(auth)/login.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(auth)/login.tsx)
- Password reset request and confirmation in [apps/mobile/app/(auth)/reset-password.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(auth)/reset-password.tsx)
- Profile, branch/firm context, and password change in [apps/mobile/app/(tabs)/profile.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(tabs)/profile.tsx)
- Expo push token registration in [apps/mobile/lib/notifications.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/lib/notifications.ts)

The mobile client stores and refreshes bearer tokens through [apps/mobile/lib/storage.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/lib/storage.ts) and [packages/api/src/client.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/packages/api/src/client.ts).

## Notes

- The repo currently has strong tenant and branch enforcement in the main operational modules, but some deeper case/report/inspection subroutes still rely on explicit firm checks instead of the newer `withTenant + req.db` pattern.
- Clients are now branch-owned within a firm. Properties remain tenant-level for now, while cases and downstream operational records continue to carry branch ownership.
- Legacy clients that could not be assigned safely during automatic backfill remain visible to managing partners until they are manually assigned to a branch.
