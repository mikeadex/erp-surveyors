# Valuation OS

Valuation OS is a multi-tenant operations platform for estate surveying and valuation firms. It combines a web control plane for office operations with a mobile app for field-facing workflows, all backed by shared business rules, shared types, and a single PostgreSQL data model.

## Repo Structure

- `apps/web`: Next.js 15 web app for firm admin, CRM, property registry, cases, inspections, billing, documents, and reporting surfaces
- `apps/mobile`: Expo mobile app for login, dashboard, cases, inspections, notifications, and profile flows
- `packages/types`: shared TypeScript contracts
- `packages/utils`: shared validators, formatters, stage rules, and schema helpers
- `packages/api`: shared API client utilities used by mobile
- `prisma`: root Prisma schema used by the monorepo
- `tests`: manual module verification guides

## Stack

- Next.js 15
- React 18
- Expo / React Native
- Prisma + PostgreSQL
- JWT auth with rotating refresh tokens
- pnpm workspaces + Turborepo
- AWS S3 / Cloudflare R2 compatible storage for documents and inspection media

## Core Functionalities

### Module A: Firm, Auth, and Team

- multi-tenant firm model with branch-aware access control
- signup, login, refresh, logout, password reset, and invite acceptance
- managing partner, admin, valuer, reviewer, finance, and field officer roles
- branch-aware team invitation and staff management
- mobile auth guard, login, reset-password, and profile/password change

Key files:

- [apps/web/lib/auth/session.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/session.ts)
- [apps/web/lib/auth/branch-scope.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/auth/branch-scope.ts)
- [apps/web/app/(dashboard)/team/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/team/page.tsx)
- [apps/mobile/app/_layout.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/_layout.tsx)

### Module B: CRM

- branch-aware client ownership inside a firm
- soft archive / restore for clients
- tags, notes, duplicate review, saved views, branch filters
- inline contact management on the client detail page
- modal create/edit flows aligned with the current shell styling

Key files:

- [apps/web/app/(dashboard)/clients/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/clients/page.tsx)
- [apps/web/app/(dashboard)/clients/[id]/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/clients/[id]/page.tsx)
- [apps/web/app/api/v1/clients/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/clients/route.ts)

### Module C: Property Registry and Comparables

- property registry with search, filters, notes, duplicate review, archive / restore
- comparable capture and list/search workflows
- nearby comparable suggestions from property detail
- create flows for properties and comparables now open in blurred modals

Key files:

- [apps/web/app/(dashboard)/properties/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/properties/page.tsx)
- [apps/web/app/(dashboard)/properties/[id]/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/properties/[id]/page.tsx)
- [apps/web/app/(dashboard)/comparables/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/comparables/page.tsx)

### Module D: Case and Instruction Management

- branch-aware case creation and lifecycle management
- modal create flow for new cases
- assignment, due date, fees, internal notes, and case checklist
- activity feed for case updates, notes, checklist changes, inspection events, and stage progress
- responsive cases list with mobile filter pop-out and card layout

Key files:

- [apps/web/app/(dashboard)/cases/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/cases/page.tsx)
- [apps/web/app/(dashboard)/cases/[id]/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/cases/[id]/page.tsx)
- [apps/web/app/api/v1/cases/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/cases/route.ts)

### Module E: Inspection Workflow

- inspection draft and submit flow
- full inspection form for occupancy, location, condition, services, summary, and notes
- signed inspection photo upload flow with presigned URLs
- inspection media list, confirm, signed download, and delete
- photo gallery integrated into the inspection workspace and case detail page

Key files:

- [apps/web/app/(dashboard)/cases/[id]/inspection/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/cases/[id]/inspection/page.tsx)
- [apps/web/components/inspections/inspection-form.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/inspections/inspection-form.tsx)
- [apps/web/components/inspections/inspection-media-manager.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/inspections/inspection-media-manager.tsx)
- [apps/web/app/api/v1/cases/[id]/inspections/[inspectionId]/media/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/cases/[id]/inspections/[inspectionId]/media/route.ts)

### Additional Operational Areas

- dashboard summaries and cases-by-stage reporting
- invoices with responsive list/search/filter workflows
- documents register and signed downloads
- audit trail
- notifications feed
- mobile tabs for dashboard, cases, inspections, notifications, and profile

## Tenant and Branch Model

The hard security boundary is the firm.

- every tenant-scoped record belongs to a `firmId`
- branches are internal operating units inside a firm, not separate tenants
- managing partners are firm-wide
- non-managing-partner staff are branch-related and branch-scoped
- authenticated APIs can use tenant helpers in [apps/web/lib/api/with-tenant.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/api/with-tenant.ts) and [apps/web/lib/db/tenant.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/db/tenant.ts)
- cross-record integrity is enforced through ownership checks in [apps/web/lib/db/ownership.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/db/ownership.ts)

## Setup Guide

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL running locally or remotely
- Xcode simulator if you want to run iOS mobile locally

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Use the root example file as the source of truth:

- [/.env.example](/Users/michaeladeleye/Documents/product/ERP Surveyors/.env.example)

For local web development, copy those values into:

- [apps/web/.env.local](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/.env.local)

Minimum required variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_APP_URL`

For inspection/document upload and signed asset access:

- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`
- `S3_ENDPOINT` if using Cloudflare R2 or another S3-compatible provider

Optional public-read fallback variables:

- `S3_PUBLIC_URL`
- `CLOUDFLARE_R2_PUBLIC_URL`

For mobile local development:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_EAS_PROJECT_ID` if you want push-token registration on device builds

The mobile app currently falls back to `http://localhost:3000` when `EXPO_PUBLIC_API_URL` is not set, which is fine for a simulator on the same machine.

### 4. Generate Prisma client and sync the database

From the repo root:

```bash
pnpm db:generate
pnpm db:push
```

If you prefer app-scoped commands:

```bash
pnpm -C apps/web db:generate
pnpm -C apps/web db:push
```

### 5. Start development

Run everything:

```bash
pnpm dev
```

Or run apps separately:

```bash
pnpm -C apps/web dev
pnpm -C apps/mobile start
```

### 6. Typecheck before pushing

```bash
pnpm typecheck
pnpm -C apps/web typecheck
pnpm -C apps/mobile typecheck
pnpm -C packages/utils typecheck
pnpm -C packages/types typecheck
pnpm -C packages/api typecheck
```

### 7. Useful local commands

```bash
pnpm db:studio
pnpm -C apps/mobile ios
pnpm -C apps/mobile android
```

## Web UI Notes

- the web shell uses a calmer neutral palette with Nigerian-green accents
- desktop sidebar is collapsible
- mobile navigation opens as a right-side full-width sheet
- major list pages now use the same responsive pattern:
  - inline filters on desktop
  - compact filter trigger + pop-out sheet on mobile
  - stacked mobile cards instead of squeezed tables

## Current Create/Edit UX Pattern

The following creation flows now open in blurred modals instead of forcing dedicated `/new` navigation from the list page:

- clients
- properties
- comparables
- cases

The same calmer form language is also being used across edit/admin surfaces such as client management, team invite, and inspection workflows.

## Storage and Media

Inspection photos and document downloads now support signed storage access.

- inspection uploads use presigned `PUT` URLs
- image and document reads can use signed `GET` URLs when credentials are configured
- when only a public asset base URL exists, the app can still render assets through redirect routes
- if storage credentials are missing, upload UI stays honest and explains why upload is unavailable

Relevant files:

- [apps/web/lib/storage/s3.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/storage/s3.ts)
- [apps/web/app/api/v1/media/[...key]/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/media/[...key]/route.ts)
- [apps/web/app/api/v1/documents/[id]/download/route.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/api/v1/documents/[id]/download/route.ts)

## Mobile Coverage Today

The mobile app currently includes:

- auth routing
- login
- password reset
- dashboard tab
- cases tab
- inspections tab
- notifications tab
- profile tab

Key files:

- [apps/mobile/app/(auth)/login.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(auth)/login.tsx)
- [apps/mobile/app/(auth)/reset-password.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(auth)/reset-password.tsx)
- [apps/mobile/app/(tabs)/cases.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(tabs)/cases.tsx)
- [apps/mobile/app/(tabs)/inspections.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(tabs)/inspections.tsx)
- [apps/mobile/app/(tabs)/profile.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/mobile/app/(tabs)/profile.tsx)

## Manual Verification Guides

Module-specific manual references live in:

- [tests/module-a.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-a.md)
- [tests/module-b.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-b.md)
- [tests/module-c.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-c.md)
- [tests/module-d.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-d.md)

## Current Gaps

- top-level reporting is still lighter than the full product vision
- mobile inspection capture still needs the native camera/upload pass to match the web upload flow
- some deeper routes still use direct Prisma firm checks instead of the newer tenant wrapper pattern

## Repository Workflow

- `main` is the stable baseline
- feature work is being done on `codex/*` branches
- changes are pushed to GitHub and reviewed through draft PRs
