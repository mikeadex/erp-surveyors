# Valuation OS — Functionality Bible
### Engineering Reference · v3.0

---

**Product:** Valuation OS  
**Market:** Nigerian estate surveying and valuation firms  
**Stack:** Next.js · TypeScript · Prisma · PostgreSQL · Expo React Native · TailAdmin  
**Audience:** Lead engineer, frontend engineer, mobile engineer  
**Status:** MVP — Pre-build reference  
**Updated:** UI foundation decisions added — TailAdmin (structural) + Studio Admin (design reference)

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [UI Foundation](#4-ui-foundation)
5. [Monorepo Structure](#5-monorepo-structure)
6. [Database Schema](#6-database-schema)
7. [Module A — Authentication, Firms, Users, Permissions](#7-module-a--authentication-firms-users-permissions)
8. [Module B — CRM and Contact Management](#8-module-b--crm-and-contact-management)
9. [Module C — Property Registry](#9-module-c--property-registry)
10. [Module D — Case and Instruction Management](#10-module-d--case-and-instruction-management)
11. [Module E — Inspection Workflow](#11-module-e--inspection-workflow)
12. [Module F — Comparable Evidence Engine](#12-module-f--comparable-evidence-engine)
13. [Module G — Valuation Workbench](#13-module-g--valuation-workbench)
14. [Module H — Report Generator](#14-module-h--report-generator)
15. [Module I — Review, QA and Compliance](#15-module-i--review-qa-and-compliance)
16. [Module J — Billing and Finance](#16-module-j--billing-and-finance)
17. [Module K — Dashboard and Analytics](#17-module-k--dashboard-and-analytics)
18. [Module L — Document Management](#18-module-l--document-management)
19. [Mobile App — Platform Strategy](#19-mobile-app--platform-strategy)
20. [Cross-Cutting Concerns](#20-cross-cutting-concerns)
21. [Error Handling Reference](#21-error-handling-reference)
22. [Performance Targets](#22-performance-targets)
23. [Sprint Plan](#23-sprint-plan)

---

## 1. Product Vision

### 1.1 Mission

Build the operating system for estate surveying and valuation firms in Nigeria. Replace operational fragmentation across Word documents, spreadsheets, WhatsApp threads, email, and scattered files with one workflow-native platform.

### 1.2 Core Value Proposition

> Run your valuation firm from one platform. Inspections, comparables, reports, billing, and compliance — built for Nigerian estate valuers.

### 1.3 Problem Statement

Most Nigerian valuation firms operate with:

- Fragmented job tracking across email, WhatsApp, and memory
- Inconsistent report structures with no shared templates
- Manual comparable reuse — largely from individual memory or personal files
- Poor visibility into staff workload, overdue jobs, and turnaround time
- Slow invoicing disconnected from job completion
- Weak audit trails and no version history on reports
- Limited institutional knowledge when staff change

### 1.4 Product Goals

1. Reduce report turnaround time
2. Standardise firm workflows
3. Centralise comparable evidence as reusable firm assets
4. Improve quality assurance and partner oversight
5. Speed up invoicing and case closure
6. Build institutional knowledge that survives staff changes

### 1.5 Non-Goals for MVP

- Public property marketplace or listing portal
- Automated valuation model (AVM)
- Advanced GIS mapping layer
- Full accounting software integration
- Lender or developer marketplace
- Consumer-facing property discovery
- AI-assisted drafting or smart comp suggestions (Phase 3)

### 1.6 Core Users

| Role | Primary Needs |
|---|---|
| Managing Partner | Oversight of all jobs, staff performance, revenue, quality, turnaround |
| Senior Reviewer | Review reports, request corrections, approve cases, ensure consistency |
| Valuer / Surveyor | Manage inspections, comparables, analysis, draft reports |
| Admin / Operations | Open jobs, assign valuers, manage documents, monitor status |
| Finance Officer | Invoice creation, payment tracking, receivables visibility |
| Field Officer | Inspection capture in the field, mobile-only workflow |

---

## 2. Architecture Overview

### 2.1 High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  WEB CLIENT                                                  │
│  Next.js 14 App Router · TypeScript · Tailwind CSS          │
│  TanStack Query · Zustand · PWA                             │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────────────┐
│  MOBILE CLIENT                                               │
│  Expo React Native · TypeScript · Expo Router               │
│  Shared API hooks from packages/api                         │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTPS / REST + JSON
┌────────────────────────▼─────────────────────────────────────┐
│  API TIER                                                    │
│  Next.js Route Handlers · TypeScript · Prisma ORM           │
│  JWT Auth (Jose) · Tenant middleware · Role guards          │
└──────────┬──────────────────────────┬────────────────────────┘
           │                          │
┌──────────▼──────────┐  ┌────────────▼──────────────────────┐
│  PostgreSQL 16      │  │  S3-Compatible Object Storage     │
│  Primary datastore  │  │  Uploads · Reports · Documents    │
│  Full-text search   │  │  Presigned URLs (15 min TTL)      │
└─────────────────────┘  └───────────────────────────────────┘
           │
┌──────────▼──────────┐  ┌────────────────────────────────────┐
│  Redis (Upstash)    │  │  Trigger.dev                       │
│  Cache · Sessions   │  │  PDF generation · CSV import      │
│  Rate limiting      │  │  Audit logs · Notifications        │
└─────────────────────┘  └────────────────────────────────────┘
```

### 2.2 Multi-Tenancy Model

Every model containing firm-specific data carries a `firmId` foreign key. The tenant middleware resolves the firm from the authenticated user's JWT on every request and injects it into the request context. Every Prisma query in the codebase **must** filter by `firmId`. This is enforced by a base query helper, not left to individual developers.

```typescript
// lib/prisma-tenant.ts
// Always use this instead of raw prisma client in route handlers

export function tenantPrisma(firmId: string) {
  return {
    cases: {
      findMany: (args: Prisma.CaseFindManyArgs) =>
        prisma.case.findMany({ ...args, where: { ...args.where, firmId } }),
      findUnique: (args: Prisma.CaseFindUniqueArgs) =>
        prisma.case.findFirst({ ...args, where: { ...args.where, firmId } }),
      // ... all models wrapped the same way
    },
    // ... all other models
  }
}

// Usage in route handler:
const db = tenantPrisma(req.firmId)
const cases = await db.cases.findMany({ where: { stage: 'draft_report' } })
// firmId is always applied — cannot be forgotten
```

### 2.3 Request Lifecycle

1. Request arrives at Next.js Route Handler with JWT in `Authorization` header or httpOnly cookie
2. `withAuth` middleware validates token and extracts `userId`
3. `withTenant` middleware resolves `firmId` from `user.firmId` and attaches to request context
4. Role guard checks `user.role` against required permission for the route
5. Handler executes Prisma queries scoped to `firmId` via `tenantPrisma(firmId)`
6. Response serialised and returned in standard envelope

```typescript
// Middleware composition pattern
export const GET = withAuth(withTenant(withRole(['managing_partner', 'admin'],
  async (req: TenantRequest) => {
    const db = tenantPrisma(req.firmId)
    const cases = await db.cases.findMany({...})
    return successResponse(cases)
  }
)))
```

### 2.4 API Response Envelope

All API responses follow a consistent envelope. Never return bare arrays or bare objects.

```typescript
// Success — single resource
{ status: 'ok', data: { ...resource } }

// Success — list
{ status: 'ok', data: [...items], meta: { count: 42, page: 1, pageSize: 25, totalPages: 2 } }

// Error
{ status: 'error', code: 'PERMISSION_DENIED', message: 'You do not have access to this resource.' }

// Validation error
{ status: 'error', code: 'VALIDATION_ERROR',
  errors: { dueDate: ['This field is required.'], feeAmount: ['Must be a positive number.'] } }
```

---

## 3. Technology Stack

### 3.1 Stack Choices

| Layer | Choice | Rationale |
|---|---|---|
| Web framework | Next.js 16 App Router | Server components for initial load, client components for interactive forms |
| Mobile framework | Expo React Native (SDK 51+) | Native camera, push notifications, reliable offline on Android |
| Language | TypeScript strict throughout | Shared types across web, mobile, and API |
| Routing (mobile) | Expo Router | Mirrors Next.js file-based routing — one mental model |
| UI foundation (web) | TailAdmin Free (MIT) | Complete admin template — task lists, invoices, user management, file manager, data tables, forms all pre-built |
| Design reference | Studio Admin (MIT) | Design language reference — spacing, typography, card styles tuned to match its premium aesthetic |
| UI components | shadcn/ui | Installed independently via CLI — buttons, dialogs, inputs, tables, tabs, badges |
| Styling | Tailwind CSS v4 | Utility-first, consistent design tokens across TailAdmin and custom screens |
| Styling (mobile) | NativeWind + StyleSheet | Tailwind-compatible classes on React Native |
| ORM | Prisma | Type-safe queries, schema-first migrations, TypeScript client generation |
| Database | PostgreSQL 16 | Primary store, full-text search via tsvector, JSONB for flexible fields |
| Auth | Jose (JWT) + NextAuth.js v5 | httpOnly cookies, access/refresh token pattern |
| State — server | TanStack Query (shared) | Consistent data fetching across web and mobile |
| State — global UI | Zustand | Modals, inspection draft state, notification count |
| Forms | React Hook Form + Zod | Type-safe forms with shared validation schemas across web and mobile |
| Tables | TanStack Table | Sortable, filterable data tables for cases, comparables, clients |
| Background jobs | Trigger.dev | PDF generation, CSV import, audit writes, notifications |
| Report templating | Handlebars | HTML template rendering for report generation — compile-time merge fields |
| PDF generation | Puppeteer (headless Chrome) | Full CSS control for professional report output |
| File storage | AWS S3 / Cloudflare R2 | Presigned URLs for upload and retrieval |
| Caching | Redis via Upstash | Dashboard aggregates, rate limiting, session store |
| Offline (web) | IndexedDB via idb-keyval | Inspection draft save for PWA |
| Offline (mobile) | MMKV + expo-sqlite | Fast key-value store, SQLite for structured offline data |
| Push notifications | Expo Notifications + FCM/APNs | Overdue cases, pending reviews, invoice alerts |
| Monorepo tooling | Turborepo | Shared package builds, cached pipelines |
| Testing | Vitest + Testing Library (web), Jest + RNTL (mobile) | |
| CI/CD | GitHub Actions | Lint, test, build on PR — deploy on merge to main |

### 3.2 Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Database tables | snake_case, plural | `cases`, `case_comparables` |
| Prisma models | PascalCase singular | `Case`, `Comparable` |
| TypeScript interfaces | PascalCase, prefixed I | `ICase`, `IComparable` |
| API route files | kebab-case | `route.ts` inside `app/api/v1/cases/` |
| React components | PascalCase | `CaseDetailScreen`, `InspectionForm` |
| Hooks | camelCase, use prefix | `useCase()`, `useCaseList()` |
| Utility functions | camelCase | `formatCurrency()`, `getCaseStageLabel()` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |

### 3.3 Authentication Flow

```
POST /api/v1/auth/login
→ Validates credentials
→ Issues access token (15 min) + refresh token (7 days)
→ Sets both as httpOnly, SameSite=Strict cookies
→ Returns { user, firm } in response body

POST /api/v1/auth/refresh
→ Reads refresh token from cookie
→ Issues new access token
→ Rotates refresh token

POST /api/v1/auth/logout
→ Clears both cookies server-side
→ Invalidates refresh token in DB

GET /api/v1/auth/me
→ Returns current user + firm context
→ Used on app load to restore session
```

---

## 4. UI Foundation

### 4.1 Decision Summary

Valuation OS uses **TailAdmin Free** as its structural UI foundation, with **Studio Admin** as a design language reference. Neither template is used as a codebase to build inside — both are used as component and pattern sources that feed into the clean Turborepo monorepo defined in Section 5.

This decision saves approximately one full sprint of UI groundwork while keeping full ownership of the codebase structure.

### 4.2 TailAdmin — Structural Foundation

**Repo:** `github.com/TailAdmin/free-nextjs-admin-dashboard`  
**License:** MIT — free for commercial use, SaaS products, and redistribution  
**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4  
**Status:** Production-complete — all required pages ship in the free version today

TailAdmin is chosen because it ships everything Valuation OS needs now, not on a roadmap. The free version is MIT licensed with no SaaS restrictions.

#### What maps directly to Valuation OS screens

| TailAdmin screen | Valuation OS equivalent | Module |
|---|---|---|
| Task List | Case list — stage groupings, assignees, due dates | D |
| Task Kanban | Case pipeline view (Phase 2) | D |
| Data Tables | Comparables library, clients list, properties list | B, C, F |
| Invoices / Single Invoice | Invoice management | J |
| Create Invoice | Invoice creation form | J |
| Transactions | Payment history | J |
| File Manager | Document library | L |
| Support List / Reply | Review comments thread on reports | I |
| CRM Dashboard | Managing partner dashboard | K |
| SaaS Dashboard | Firm analytics view | K |
| Form Elements / Layout | Inspection form, case creation, comparable entry | E, D, F |
| User Profile | Valuer profile and settings | A |
| Inbox | Notification centre | Cross-cutting |
| Charts (Line, Bar, Pie) | Dashboard analytics widgets | K |

This covers approximately **70% of the Valuation OS screen map** directly. The remaining 30% — inspection form sections, comparable side-by-side grid, case stage pipeline tracker, and report preview — are custom builds that inherit the TailAdmin design system.

#### What is NOT taken from TailAdmin

- The folder structure and routing — your monorepo structure (Section 5) is used instead
- Demo data and placeholder content
- Pages not relevant to valuation workflows (e-commerce, stocks, logistics)

#### How to use it correctly

Extract components into your monorepo — do not build inside TailAdmin's repo:

```bash
# In apps/web — extract only what you need per sprint
# Reference TailAdmin source for component patterns and Tailwind class combinations
# Copy sidebar, navigation shell, page wrapper, breadcrumbs in Sprint 0
# Copy table pattern when building cases list in Sprint 3
# Copy form layout when building inspection form in Sprint 4
# Copy invoice screens when building billing in Sprint 8
```

#### Upgrade path

The free MIT version covers the full MVP and pilot. Consider purchasing the **Extended Pro plan ($299 one-time)** after pilot launch — it adds 500+ additional components and the Figma design source files, which accelerates custom screen design in v1.5 and v2.

> **Important:** The Starter ($59) and Business ($119) plans are not licensed for SaaS end products. The Extended ($299) plan is the correct SaaS license. The free MIT version has no such restriction.

### 4.3 Studio Admin — Design Language Reference

**Repo:** `github.com/arhamkhnz/next-shadcn-admin-dashboard`  
**License:** MIT  
**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui  
**Status:** Partial — CRM and Finance dashboards live, Kanban/Invoice/Users/Roles still coming soon

Studio Admin is **not used as a structural foundation** because too many required pages (invoice management, user management, roles, task lists) are still marked as coming soon. Using it as a base would create sprint dependencies on an incomplete template.

It is used as a **visual reference** for:

- Spacing and padding rhythm — tighter and more considered than TailAdmin's defaults
- Typography scale — cleaner heading hierarchy
- Card and panel styles — minimal borders, subtle shadows
- Colour usage — restrained accent colour application
- Table design — the CRM leads table aesthetic maps well to the case list

#### How to reference it

Open the Studio Admin demo alongside your Figma or code when styling TailAdmin components. Use it to answer "does this feel premium enough?" rather than "where do I copy this component from."

The shadcn/ui components it uses can be installed independently into your `apps/web`:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add command    # command palette / search
npx shadcn@latest add popover
npx shadcn@latest add dropdown-menu
```

These complement TailAdmin's own component set for specific interaction patterns.

### 4.4 Custom Screens — Built from Scratch

Three screens have no adequate analogue in either template and must be built as original components using the shared Tailwind design system:

| Screen | Why custom | Sprint |
|---|---|---|
| Case stage pipeline tracker | Visual pipeline with 13 stages, overdue flags, one-click advance | Sprint 3 |
| Inspection form (mobile-first, section-by-section) | Multi-section progressive form with offline save and per-section photo upload | Sprint 4 |
| Comparable side-by-side grid (workbench) | Horizontal comparison table of selected comparables with adjustment fields | Sprint 6a |
| Report preview and annotation | Split-panel PDF preview with inline review comment thread | Sprint 6b |

These are the screens that define whether the product feels built for valuers or built for generic SaaS users. The design investment here matters most.

### 4.5 Design Tokens — Valuation OS Brand

Apply these Tailwind CSS v4 design tokens consistently across all screens — TailAdmin-derived and custom alike:

```css
/* apps/web/app/globals.css */
@layer base {
  :root {
    /* Brand */
    --color-brand-900: #0F2D4A;   /* primary — headings, sidebar, key UI */
    --color-brand-700: #1A4A6E;   /* secondary — links, active states */
    --color-brand-100: #D6E8F5;   /* accent bg — info banners, highlights */

    /* Status */
    --color-success: #1B5E20;
    --color-warning: #E65100;
    --color-danger:  #B71C1C;
    --color-overdue: #7B3F00;

    /* Neutral */
    --color-surface:  #F4F6F8;    /* page background */
    --color-border:   #C8D0D8;    /* all borders */
    --color-text:     #0D0D0D;    /* body text */
    --color-muted:    #52606E;    /* secondary text, labels */
  }
}
```

---

## 5. Monorepo Structure

```
valuation-os/
├── apps/
│   ├── web/                    ← Next.js 16 web platform
│   │   ├── app/
│   │   │   ├── (auth)/         ← Login, password reset
│   │   │   ├── (dashboard)/    ← All authenticated routes
│   │   │   │   ├── cases/
│   │   │   │   ├── comparables/
│   │   │   │   ├── properties/
│   │   │   │   ├── clients/
│   │   │   │   ├── reports/
│   │   │   │   ├── invoices/
│   │   │   │   ├── documents/
│   │   │   │   └── settings/
│   │   │   └── api/
│   │   │       └── v1/         ← All Route Handlers live here
│   │   ├── components/
│   │   │   ├── layout/         ← Extracted from TailAdmin: sidebar, nav, breadcrumbs, page-wrapper
│   │   │   ├── ui/             ← shadcn/ui components installed via CLI
│   │   │   ├── charts/         ← Chart components (adapted from TailAdmin)
│   │   │   ├── tables/         ← TanStack Table wrappers (adapted from TailAdmin)
│   │   │   ├── forms/          ← React Hook Form + Zod form components
│   │   │   └── custom/         ← Valuation OS-specific: stage tracker, workbench grid, inspection form
│   │   ├── lib/                ← Web-specific utilities
│   │   └── public/
│   │
│   └── mobile/                 ← Expo React Native app
│       ├── app/
│       │   ├── (auth)/         ← Login screen
│       │   ├── (tabs)/         ← Tab navigator
│       │   │   ├── dashboard/
│       │   │   ├── cases/
│       │   │   ├── inspections/
│       │   │   └── notifications/
│       │   └── _layout.tsx
│       ├── components/         ← Native UI components
│       └── lib/                ← Mobile-specific utilities
│
├── packages/
│   ├── types/                  ← Shared TypeScript interfaces
│   │   ├── case.ts
│   │   ├── comparable.ts
│   │   ├── inspection.ts
│   │   ├── report.ts
│   │   ├── user.ts
│   │   └── index.ts
│   │
│   ├── api/                    ← Shared TanStack Query hooks
│   │   ├── hooks/
│   │   │   ├── useCases.ts
│   │   │   ├── useComparables.ts
│   │   │   ├── useInspection.ts
│   │   │   └── useReports.ts
│   │   ├── client.ts           ← Base fetch client
│   │   └── index.ts
│   │
│   └── utils/                  ← Shared utilities
│       ├── formatters.ts       ← Currency, date, address formatting
│       ├── validators.ts       ← Zod schemas shared across web + mobile
│       ├── constants.ts        ← Stage enums, role lists, valuation types
│       └── index.ts
│
├── prisma/
│   ├── schema.prisma           ← Single source of truth for DB schema
│   └── migrations/
│
├── turbo.json
└── package.json
```

### 5.1 Shared Package Usage Pattern

```typescript
// packages/types/case.ts — defined once
export interface ICase {
  id: string
  reference: string
  stage: CaseStage
  client: IClient
  property: IProperty
  assignedValuer: IUser
  dueDate: string | null
  isOverdue: boolean
  feeAmount: number | null
  createdAt: string
}

// packages/api/hooks/useCases.ts — defined once
export function useCaseList(filters?: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => apiClient.get<ICase[]>('/api/v1/cases', filters),
    staleTime: 30_000,
  })
}

// apps/web — uses shared hook, renders with HTML
import { useCaseList } from '@valuation-os/api'
export function CasesTable() {
  const { data, isLoading } = useCaseList()
  return <table>...</table>
}

// apps/mobile — uses same shared hook, renders with RN components
import { useCaseList } from '@valuation-os/api'
export function CasesList() {
  const { data, isLoading } = useCaseList()
  return <FlatList data={data} renderItem={...} />
}
```

---

## 6. Database Schema

> All tables use UUID primary keys. All tables include `createdAt` and `updatedAt` timestamps. Soft deletes via `deletedAt` where noted. All foreign keys are indexed.

> **Critical rule:** Never query without `firmId` in the WHERE clause for any tenant-scoped table. The `tenantPrisma` helper enforces this. Raw queries must include `firmId` manually.

### 6.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── FIRMS ────────────────────────────────────────────────────

model Firm {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(200)
  slug      String   @unique @db.VarChar(100)
  logoUrl   String?
  address   String?
  phone     String?  @db.VarChar(30)
  email     String?  @db.VarChar(200)
  plan      String   @default("starter") // starter | professional | enterprise
  isActive  Boolean  @default(true)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  branches   Branch[]
  users      User[]
  clients    Client[]
  properties Property[]
  cases      Case[]
  comparables Comparable[]
  invoices   Invoice[]
  documents  Document[]
  notifications Notification[]
  reportTemplates ReportTemplate[]

  @@map("firms")
}

// ─── BRANCHES ─────────────────────────────────────────────────

model Branch {
  id        String   @id @default(uuid())
  firmId    String
  firm      Firm     @relation(fields: [firmId], references: [id])
  name      String   @db.VarChar(200)
  city      String?  @db.VarChar(100)
  state     String?  @db.VarChar(100)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users User[]
  cases Case[]

  @@index([firmId])
  @@map("branches")
}

// ─── USERS ────────────────────────────────────────────────────

model User {
  id                  String    @id @default(uuid())
  firmId              String
  firm                Firm      @relation(fields: [firmId], references: [id])
  branchId            String?
  branch              Branch?   @relation(fields: [branchId], references: [id])
  email               String    @unique @db.VarChar(254)
  passwordHash        String    @db.VarChar(255)
  firstName           String    @db.VarChar(100)
  lastName            String    @db.VarChar(100)
  phone               String?   @db.VarChar(30)
  role                UserRole
  isActive            Boolean   @default(true)
  lastLoginAt         DateTime?
  invitedById         String?
  invitedBy           User?     @relation("InvitedBy", fields: [invitedById], references: [id])
  invitations         User[]    @relation("InvitedBy")
  invitationToken     String?   @db.VarChar(100)
  invitationExpiresAt DateTime?
  expoPushToken       String?   @db.VarChar(500)   // Expo push token for mobile notifications
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  assignedCases       Case[]    @relation("AssignedValuer")
  reviewingCases      Case[]    @relation("AssignedReviewer")
  inspections         Inspection[]
  notifications       Notification[]
  auditLogs           AuditLog[]

  @@index([firmId])
  @@index([firmId, role])
  @@map("users")
}

enum UserRole {
  managing_partner
  senior_reviewer
  valuer
  admin
  finance
  field_officer
}

// ─── CLIENTS ──────────────────────────────────────────────────

model Client {
  id           String      @id @default(uuid())
  firmId       String
  firm         Firm        @relation(fields: [firmId], references: [id])
  clientType   ClientType
  displayName  String      @db.VarChar(300)
  companyName  String?     @db.VarChar(300)
  email        String?     @db.VarChar(254)
  phone        String?     @db.VarChar(30)
  address      String?
  tags         String[]    @default([])
  notes        String?
  createdById  String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  contacts     ClientContact[]
  cases        Case[]
  invoices     Invoice[]
  documents    Document[]

  @@index([firmId])
  @@map("clients")
}

enum ClientType {
  individual
  organisation
}

model ClientContact {
  id          String   @id @default(uuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  firmId      String
  name        String   @db.VarChar(200)
  roleTitle   String?  @db.VarChar(100)
  email       String?  @db.VarChar(254)
  phone       String?  @db.VarChar(30)
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([clientId])
  @@index([firmId])
  @@map("client_contacts")
}

// ─── PROPERTIES ───────────────────────────────────────────────

model Property {
  id            String        @id @default(uuid())
  firmId        String
  firm          Firm          @relation(fields: [firmId], references: [id])
  titleRef      String?       @db.VarChar(200)
  addressLine1  String        @db.VarChar(300)
  addressLine2  String?       @db.VarChar(300)
  city          String        @db.VarChar(100)
  state         String        @db.VarChar(100)
  lga           String?       @db.VarChar(100)
  propertyType  PropertyType
  useClass      String?       @db.VarChar(100)
  tenure        TenureType?
  sizeSqm       Decimal?      @db.Decimal(12, 2)
  sizeUnit      String        @default("sqm") @db.VarChar(20)
  latitude      Decimal?      @db.Decimal(10, 7)
  longitude     Decimal?      @db.Decimal(10, 7)
  notes         String?
  createdById   String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  cases         Case[]
  documents     Document[]

  @@index([firmId])
  @@index([firmId, state])
  @@index([firmId, propertyType])
  @@map("properties")
}

enum PropertyType {
  residential
  commercial
  industrial
  land
  mixed_use
}

enum TenureType {
  freehold
  leasehold
  statutory_right_of_occupancy
  customary
}

// ─── CASES ────────────────────────────────────────────────────

model Case {
  id                  String      @id @default(uuid())
  firmId              String
  firm                Firm        @relation(fields: [firmId], references: [id])
  branchId            String?
  branch              Branch?     @relation(fields: [branchId], references: [id])
  reference           String      @unique @db.VarChar(30)
  clientId            String
  client              Client      @relation(fields: [clientId], references: [id])
  propertyId          String
  property            Property    @relation(fields: [propertyId], references: [id])
  valuationType       ValuationType
  valuationPurpose    String?     @db.VarChar(200)
  assignedValuerId    String
  assignedValuer      User        @relation("AssignedValuer", fields: [assignedValuerId], references: [id])
  assignedReviewerId  String?
  assignedReviewer    User?       @relation("AssignedReviewer", fields: [assignedReviewerId], references: [id])
  stage               CaseStage   @default(enquiry_received)
  dueDate             DateTime?
  feeAmount           Decimal?    @db.Decimal(14, 2)
  feeCurrency         String      @default("NGN") @db.VarChar(5)
  isOverdue           Boolean     @default(false)   // updated by scheduled job
  internalNotes       String?
  createdById         String
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  deletedAt           DateTime?

  stageHistory        CaseStageHistory[]
  checklistItems      CaseChecklistItem[]
  inspection          Inspection?
  caseComparables     CaseComparable[]
  analysis            ValuationAnalysis?
  reports             Report[]
  invoice             Invoice?
  documents           Document[]

  @@index([firmId])
  @@index([firmId, stage])
  @@index([firmId, assignedValuerId])
  @@index([firmId, isOverdue])
  @@map("cases")
}

enum CaseStage {
  enquiry_received
  quote_issued
  instruction_accepted
  case_opened
  inspection_scheduled
  inspection_completed
  comparable_analysis
  draft_report
  review
  final_issued
  invoice_sent
  payment_received
  archived
}

enum ValuationType {
  market
  rental
  mortgage
  insurance
  probate
  commercial
  land
}

model CaseStageHistory {
  id          String    @id @default(uuid())
  caseId      String
  case        Case      @relation(fields: [caseId], references: [id])
  firmId      String
  fromStage   CaseStage?
  toStage     CaseStage
  changedById String
  note        String?
  createdAt   DateTime  @default(now())

  @@index([caseId])
  @@map("case_stage_history")
}

model CaseChecklistItem {
  id           String    @id @default(uuid())
  caseId       String
  case         Case      @relation(fields: [caseId], references: [id])
  firmId       String
  label        String    @db.VarChar(300)
  isComplete   Boolean   @default(false)
  completedById String?
  completedAt  DateTime?
  sortOrder    Int       @default(0)
  createdAt    DateTime  @default(now())

  @@index([caseId])
  @@map("case_checklist_items")
}

// ─── INSPECTIONS ──────────────────────────────────────────────

model Inspection {
  id                   String           @id @default(uuid())
  caseId               String           @unique  // one per case
  case                 Case             @relation(fields: [caseId], references: [id])
  firmId               String
  inspectorId          String
  inspector            User             @relation(fields: [inspectorId], references: [id])
  inspectionDate       DateTime?
  status               InspectionStatus @default(draft)
  occupancyStatus      String?          @db.VarChar(50)
  conditionSummary     String?
  accessSurroundings   String?
  externalCondition    String?
  internalCondition    String?
  accommodationSummary String?
  servicesUtilities    String?
  risksDefects         String?
  marketabilityNotes   String?
  inspectorNotes       String?
  offlineDraft         Json?            // full form state from offline save
  submittedAt          DateTime?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  media                InspectionMedia[]

  @@index([firmId])
  @@index([inspectorId])
  @@map("inspections")
}

enum InspectionStatus {
  draft
  submitted
}

model InspectionMedia {
  id           String   @id @default(uuid())
  inspectionId String
  inspection   Inspection @relation(fields: [inspectionId], references: [id])
  firmId       String
  section      String   @db.VarChar(50)
  fileKey      String
  fileType     String   @db.VarChar(20)
  caption      String?  @db.VarChar(300)
  sortOrder    Int      @default(0)
  uploadedById String
  createdAt    DateTime @default(now())

  @@index([inspectionId])
  @@map("inspection_media")
}

// ─── COMPARABLES ──────────────────────────────────────────────

model Comparable {
  id              String         @id @default(uuid())
  firmId          String
  firm            Firm           @relation(fields: [firmId], references: [id])
  createdById     String
  comparableType  ComparableType
  address         String         @db.VarChar(400)
  city            String?        @db.VarChar(100)
  state           String?        @db.VarChar(100)
  lga             String?        @db.VarChar(100)
  propertyType    PropertyType?
  sizeSqm         Decimal?       @db.Decimal(12, 2)
  priceAmount     Decimal?       @db.Decimal(16, 2)
  priceCurrency   String         @default("NGN") @db.VarChar(5)
  ratePerSqm      Decimal?       @db.Decimal(14, 2)  // computed: price / size
  evidenceDate    DateTime
  source          String         @db.VarChar(200)
  sourceType      SourceType
  confidenceLevel Int            @default(3)   // 1-5
  notes           String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?

  caseComparables CaseComparable[]

  @@index([firmId])
  @@index([firmId, comparableType])
  @@index([firmId, state])
  @@index([firmId, evidenceDate])
  @@map("comparables")
}

enum ComparableType {
  sales
  rental
  land
}

enum SourceType {
  firm_survey
  agent
  published
  imported
  other
}

model CaseComparable {
  id               String     @id @default(uuid())
  caseId           String
  case             Case       @relation(fields: [caseId], references: [id])
  comparableId     String
  comparable       Comparable @relation(fields: [comparableId], references: [id])
  firmId           String
  relevanceScore   Int        @default(3)  // 1-5, per-case not global
  adjustmentNotes  String?
  weight           Decimal?   @db.Decimal(5, 2)
  addedById        String
  createdAt        DateTime   @default(now())

  @@unique([caseId, comparableId])
  @@index([caseId])
  @@index([comparableId])
  @@map("case_comparables")
}

// ─── COMPARABLE IMPORT JOBS ───────────────────────────────────

model ComparableImportJob {
  id             String            @id @default(uuid())
  firmId         String
  fileKey        String            // S3 key of uploaded CSV
  status         ImportJobStatus   @default(pending)
  importedCount  Int               @default(0)
  failedCount    Int               @default(0)
  errors         Json              @default("[]")  // [{row, error}]
  createdById    String
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([firmId])
  @@index([firmId, status])
  @@map("comparable_import_jobs")
}

enum ImportJobStatus {
  pending
  processing
  complete
  partial_failure
  failed
}

// ─── VALUATION ANALYSIS ───────────────────────────────────────

model ValuationAnalysis {
  id                 String          @id @default(uuid())
  caseId             String          @unique  // one per case
  case               Case            @relation(fields: [caseId], references: [id])
  firmId             String
  method             ValuationMethod
  basisOfValue       BasisOfValue
  assumptions        Json            @default("[]")  // [{id, text}]
  specialAssumptions Json            @default("[]")  // [{id, text}]
  commentary         String?
  concludedValue     Decimal?        @db.Decimal(16, 2)
  valueCurrency      String          @default("NGN") @db.VarChar(5)
  dateOfValuation    DateTime?
  status             AnalysisStatus  @default(draft)
  createdById        String
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@index([firmId])
  @@map("valuation_analyses")
}

enum ValuationMethod {
  comparison
  investment
  residual
  contractors
  profits
}

enum BasisOfValue {
  market_value
  market_rent
  investment_value
  reinstatement_cost
  other
}

enum AnalysisStatus {
  draft
  complete
}

// ─── REPORTS ──────────────────────────────────────────────────

model ReportTemplate {
  id                  String   @id @default(uuid())
  firmId              String
  firm                Firm     @relation(fields: [firmId], references: [id])
  name                String   @db.VarChar(200)
  valuationType       ValuationType
  templateHtml        String   @db.Text  // Handlebars/Mustache template
  defaultAssumptions  Json     @default("[]")
  defaultDisclaimers  Json     @default("[]")
  isActive            Boolean  @default(true)
  createdById         String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  reports Report[]

  @@index([firmId])
  @@map("report_templates")
}

model Report {
  id             String       @id @default(uuid())
  caseId         String
  case           Case         @relation(fields: [caseId], references: [id])
  firmId         String
  templateId     String
  template       ReportTemplate @relation(fields: [templateId], references: [id])
  versionNumber  Int          @default(1)
  status         ReportStatus @default(draft)
  renderedHtml   String?      // full rendered HTML
  pdfFileKey     String?      // S3 key
  generatedById  String
  approvedById   String?
  approvedAt     DateTime?
  issuedAt       DateTime?
  createdAt      DateTime     @default(now())

  reviewComments ReviewComment[]

  @@index([caseId])
  @@index([firmId])
  @@index([firmId, status])
  @@map("reports")
}

enum ReportStatus {
  draft
  under_review
  approved
  issued
}

model ReviewComment {
  id           String        @id @default(uuid())
  reportId     String
  report       Report        @relation(fields: [reportId], references: [id])
  caseId       String
  firmId       String
  reviewerId   String
  commentText  String
  severity     CommentSeverity
  status       CommentStatus @default(open)
  resolvedById String?
  resolvedAt   DateTime?
  createdAt    DateTime      @default(now())

  @@index([reportId])
  @@index([caseId])
  @@index([firmId, status])
  @@map("review_comments")
}

enum CommentSeverity {
  minor
  major
  blocking
}

enum CommentStatus {
  open
  resolved
}

// ─── INVOICES ─────────────────────────────────────────────────

model Invoice {
  id            String        @id @default(uuid())
  firmId        String
  firm          Firm          @relation(fields: [firmId], references: [id])
  caseId        String        @unique  // one invoice per case at MVP
  case          Case          @relation(fields: [caseId], references: [id])
  clientId      String
  client        Client        @relation(fields: [clientId], references: [id])
  invoiceNumber String        @unique @db.VarChar(30)
  amount        Decimal       @db.Decimal(14, 2)
  taxAmount     Decimal       @default(0) @db.Decimal(14, 2)
  currency      String        @default("NGN") @db.VarChar(5)
  description   String?
  status        InvoiceStatus @default(draft)
  issueDate     DateTime?
  dueDate       DateTime?
  paidAt        DateTime?
  createdById   String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([firmId])
  @@index([firmId, status])
  @@index([clientId])
  @@map("invoices")
}

enum InvoiceStatus {
  draft
  issued
  partial
  paid
  void
}

// ─── DOCUMENTS ────────────────────────────────────────────────

model Document {
  id          String   @id @default(uuid())
  firmId      String
  firm        Firm     @relation(fields: [firmId], references: [id])
  caseId      String?
  case        Case?    @relation(fields: [caseId], references: [id])
  propertyId  String?
  property    Property? @relation(fields: [propertyId], references: [id])
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id])
  title       String   @db.VarChar(300)
  category    DocumentCategory
  fileKey     String
  fileSize    Int?
  mimeType    String?  @db.VarChar(100)
  tags        String[] @default([])
  uploadedById String
  createdAt   DateTime @default(now())
  deletedAt   DateTime?

  @@index([firmId])
  @@index([caseId])
  @@index([propertyId])
  @@map("documents")
}

enum DocumentCategory {
  instruction_letter
  title_document
  inspection_report
  valuation_report
  invoice
  legal
  other
}

// ─── AUDIT LOGS ───────────────────────────────────────────────

model AuditLog {
  id          String   @id @default(uuid())
  firmId      String
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  entityType  String   @db.VarChar(60)
  entityId    String
  action      String   @db.VarChar(60)
  oldValue    Json?
  newValue    Json?
  ipAddress   String?  @db.VarChar(45)
  createdAt   DateTime @default(now())  // immutable — no updatedAt

  @@index([firmId, entityType, entityId])
  @@index([firmId, userId])
  @@index([firmId, createdAt(sort: Desc)])
  @@map("audit_logs")
}

// ─── NOTIFICATIONS ────────────────────────────────────────────

model Notification {
  id          String           @id @default(uuid())
  firmId      String
  firm        Firm             @relation(fields: [firmId], references: [id])
  userId      String
  user        User             @relation(fields: [userId], references: [id])
  type        NotificationType
  title       String           @db.VarChar(300)
  body        String?          @db.VarChar(500)
  entityType  String           @db.VarChar(60)
  entityId    String
  isRead      Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  @@index([userId, isRead])
  @@index([firmId, userId])
  @@map("notifications")
}

enum NotificationType {
  case_overdue
  report_pending_review
  comment_unresolved
  invoice_overdue
}
```

---

## 7. Module A — Authentication, Firms, Users, Permissions

### 7.1 Roles and Permissions Matrix

| Permission | Mng Partner | Reviewer | Valuer | Admin | Finance | Field Officer |
|---|---|---|---|---|---|---|
| View all cases | ✓ | ✓ | own | ✓ | ✓ | own |
| Create cases | ✓ | — | ✓ | ✓ | — | — |
| Assign valuer/reviewer | ✓ | — | — | ✓ | — | — |
| Complete inspection | ✓ | — | ✓ | — | — | ✓ |
| Add comparables | ✓ | ✓ | ✓ | — | — | — |
| Edit analysis workbench | ✓ | — | ✓ | — | — | — |
| Generate report | ✓ | — | ✓ | — | — | — |
| Review and approve report | ✓ | ✓ | — | — | — | — |
| Issue report | ✓ | ✓ | — | — | — | — |
| Create invoice | ✓ | — | — | ✓ | ✓ | — |
| Mark invoice paid | ✓ | — | — | — | ✓ | — |
| View dashboard | all | own | own | all | finance | own |
| Manage users | ✓ | — | — | — | — | — |
| Manage templates | ✓ | — | — | ✓ | — | — |
| View audit log | ✓ | — | — | — | — | — |

### 7.2 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Issue access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Authenticated | Invalidate tokens |
| POST | `/api/v1/auth/password/reset` | Public | Initiate password reset |
| POST | `/api/v1/auth/password/confirm` | Public | Confirm reset with token |
| GET | `/api/v1/auth/me` | Authenticated | Current user and firm context |
| GET | `/api/v1/users` | managing_partner \| admin | List firm users |
| POST | `/api/v1/users/invite` | managing_partner \| admin | Send invitation |
| GET | `/api/v1/users/[id]` | managing_partner \| admin | User detail |
| PATCH | `/api/v1/users/[id]` | managing_partner \| admin | Update role or branch |
| DELETE | `/api/v1/users/[id]` | managing_partner | Deactivate user |
| GET | `/api/v1/firms/me` | Authenticated | Current firm profile |
| PATCH | `/api/v1/firms/me` | managing_partner | Update firm profile |
| GET | `/api/v1/branches` | Authenticated | List branches |
| POST | `/api/v1/branches` | managing_partner \| admin | Create branch |
| PATCH | `/api/v1/branches/[id]` | managing_partner \| admin | Update branch |
| POST | `/api/v1/users/push-token` | Authenticated | Register Expo push token for mobile notifications |

### 7.3 Business Logic Rules

| Rule | Detail |
|---|---|
| Password hashing | bcrypt, cost factor 12. Minimum 10 chars, must include uppercase, lowercase, digit |
| Access token TTL | 15 minutes. Rotate on refresh. Revoke all on logout |
| Refresh token TTL | 7 days. One active refresh token per user stored in DB |
| Invitation token | 64-char hex random. Expires 48h from issue. Nulled after acceptance |
| Role changes | Managing partner only. Write to audit log on every role change |
| Deactivation | Sets `isActive=false`. Revokes all active tokens. Record is preserved |
| Cross-tenant guard | `tenantPrisma(firmId)` enforces firm scope on every query |

### 7.4 Middleware Pattern

```typescript
// apps/web/lib/middleware/with-auth.ts

import { withAuth } from './with-auth'
import { withTenant } from './with-tenant'
import { withRole } from './with-role'

// Route handler composition
export const GET = withAuth(
  withTenant(
    withRole(['managing_partner', 'admin'], async (req: TenantRequest) => {
      const db = tenantPrisma(req.firmId)
      const users = await db.users.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
      return successResponse(users)
    })
  )
)
```

---

## 8. Module B — CRM and Contact Management

### 8.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/clients` | Authenticated | List with search and filters |
| POST | `/api/v1/clients` | Authenticated | Create client |
| GET | `/api/v1/clients/[id]` | Authenticated | Client detail with linked cases |
| PATCH | `/api/v1/clients/[id]` | Authenticated | Update client |
| DELETE | `/api/v1/clients/[id]` | managing_partner \| admin | Soft delete |
| GET | `/api/v1/clients/[id]/cases` | Authenticated | All cases for this client |
| POST | `/api/v1/clients/[id]/contacts` | Authenticated | Add contact |
| PATCH | `/api/v1/clients/[id]/contacts/[cid]` | Authenticated | Update contact |
| DELETE | `/api/v1/clients/[id]/contacts/[cid]` | Authenticated | Remove contact |

### 8.2 Search Implementation

```typescript
// Full-text search via PostgreSQL tsvector
// Run as raw query for FTS — Prisma doesn't wrap tsvector natively

const clients = await prisma.$queryRaw`
  SELECT * FROM clients
  WHERE firm_id = ${firmId}
    AND deleted_at IS NULL
    AND search_vector @@ plainto_tsquery('english', ${query})
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC
  LIMIT 25
`

// search_vector is a GENERATED ALWAYS column:
-- ALTER TABLE clients ADD COLUMN search_vector tsvector
-- GENERATED ALWAYS AS (
--   to_tsvector('english',
--     coalesce(display_name, '') || ' ' ||
--     coalesce(company_name, '') || ' ' ||
--     coalesce(email, '') || ' ' ||
--     coalesce(phone, '')
--   )
-- ) STORED;
-- CREATE INDEX clients_search_vector_idx ON clients USING GIN(search_vector);
```

### 8.3 Business Logic Rules

| Rule | Detail |
|---|---|
| Duplicate detection | On create, warn (not block) if `displayName` + firm matches existing record with trigram similarity > 0.7 via `pg_trgm` extension |
| Soft delete | `deletedAt` timestamp. Excluded from all list queries. Preserved in case history |
| Tags | Stored as `String[]`. Lowercase and trimmed on save. GIN index on array column |
| Primary contact | Only one `ClientContact` per client can have `isPrimary=true`. Enforce in API validation |

---

## 9. Module C — Property Registry

### 9.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/properties` | Authenticated | List with search and filters |
| POST | `/api/v1/properties` | Authenticated | Create property |
| GET | `/api/v1/properties/[id]` | Authenticated | Property detail with case history |
| PATCH | `/api/v1/properties/[id]` | Authenticated | Update property |
| DELETE | `/api/v1/properties/[id]` | managing_partner \| admin | Soft delete |
| GET | `/api/v1/properties/[id]/cases` | Authenticated | All cases for property |
| GET | `/api/v1/properties/[id]/comparables` | Authenticated | Comparables near property |

### 9.2 Business Logic Rules

| Rule | Detail |
|---|---|
| Coordinates | Store as `Decimal(10,7)`. No GIS extension at MVP. Validate: lat -90 to 90, lng -180 to 180 |
| Size units | Canonical unit is sqm. Convert sqft on input: `sqm = sqft * 0.092903`. Display in user preference via frontend |
| Tenure values | `freehold`, `leasehold`, `statutory_right_of_occupancy`, `customary` — mapped to Nigerian land law. Do not reduce |
| Duplicate guard | Warn if `addressLine1 + city + state` matches existing property within Levenshtein distance 3 |

---

## 10. Module D — Case and Instruction Management

### 10.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/cases` | Authenticated | List — filtered by role automatically |
| POST | `/api/v1/cases` | valuer \| admin \| managing_partner | Create case |
| GET | `/api/v1/cases/[id]` | Authenticated | Full case detail |
| PATCH | `/api/v1/cases/[id]` | valuer \| admin \| managing_partner | Update case fields |
| POST | `/api/v1/cases/[id]/advance-stage` | Role-dependent | Advance to next stage |
| GET | `/api/v1/cases/[id]/activity` | Authenticated | Case activity log |
| POST | `/api/v1/cases/[id]/notes` | Authenticated | Add internal note |
| GET | `/api/v1/cases/[id]/checklist` | Authenticated | Retrieve checklist items |
| PATCH | `/api/v1/cases/[id]/checklist/[itemId]` | Authenticated | Toggle checklist item |
| GET | `/api/v1/cases/overdue` | managing_partner \| admin | All overdue cases |
| GET | `/api/v1/dashboard/cases-by-stage` | Authenticated | Aggregate counts by stage |

### 10.2 Case Reference Generation

```typescript
// Auto-generated on case creation: {FIRM_SLUG}-{YYYY}-{NNNN}
// Example: VOS-2025-0042

async function generateCaseReference(firmId: string, slug: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.case.count({
    where: {
      firmId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      }
    }
  })
  return `${slug.toUpperCase()}-${year}-${String(count + 1).padStart(4, '0')}`
}
```

### 10.3 Stage Transition Rules

> Stage transitions are enforced server-side. The frontend may show/hide the advance button but the API always validates.

| Transition | Pre-conditions |
|---|---|
| → `quote_issued` | None |
| → `instruction_accepted` | None |
| → `case_opened` | None |
| → `inspection_scheduled` | `dueDate` set, `assignedValuerId` set |
| → `inspection_completed` | Inspection exists with `status = submitted` |
| → `comparable_analysis` | At least one comparable linked to case |
| → `draft_report` | `ValuationAnalysis` exists with `status = complete` and `concludedValue` not null |
| → `review` | Report exists with `status = draft`. `assignedReviewerId` set |
| → `final_issued` | Latest report `status = approved`. No unresolved `blocking` review comments |
| → `invoice_sent` | Invoice record exists for this case |
| → `payment_received` | Invoice `status = paid` |
| → `archived` | None |

```typescript
// packages/utils/stage-transitions.ts

export const STAGE_TRANSITION_RULES: Record<CaseStage, StageRule> = {
  inspection_scheduled: {
    requires: ['dueDate', 'assignedValuerId'],
  },
  inspection_completed: {
    requiresInspectionSubmitted: true,
  },
  comparable_analysis: {
    requiresComparables: true,
  },
  draft_report: {
    requiresAnalysisComplete: true,
  },
  review: {
    requiresReportDraft: true,
    requiresReviewer: true,
  },
  final_issued: {
    requiresReportApproved: true,
    noBlockingComments: true,
  },
  invoice_sent: {
    requiresInvoice: true,
  },
  payment_received: {
    requiresInvoicePaid: true,
  },
}

export async function validateStageTransition(
  caseId: string,
  toStage: CaseStage,
  db: ReturnType<typeof tenantPrisma>
): Promise<string[]> {
  const errors: string[] = []
  const rules = STAGE_TRANSITION_RULES[toStage]
  if (!rules) return errors

  const caseData = await db.cases.findUnique({
    where: { id: caseId },
    include: { inspection: true, caseComparables: true,
               analysis: true, reports: true, invoice: true }
  })

  if (rules.requires) {
    for (const field of rules.requires) {
      if (!caseData?.[field as keyof typeof caseData]) {
        errors.push(`${field} is required before advancing to ${toStage}`)
      }
    }
  }
  if (rules.requiresInspectionSubmitted &&
      caseData?.inspection?.status !== 'submitted') {
    errors.push('Inspection must be submitted before advancing')
  }
  // ... additional checks

  return errors
}
```

### 10.4 Overdue Flag Update

```typescript
// Trigger.dev scheduled job — runs daily at 07:00 WAT

export const updateOverdueCases = trigger.defineJob({
  id: 'update-overdue-cases',
  name: 'Update Overdue Cases Flag',
  version: '1.0.0',
  trigger: cronTrigger({ cron: '0 6 * * *' }),  // 06:00 UTC = 07:00 WAT
  run: async (payload, io) => {
    const terminalStages = [
      'final_issued', 'invoice_sent', 'payment_received', 'archived'
    ]
    await prisma.case.updateMany({
      where: {
        dueDate: { lt: new Date() },
        stage: { notIn: terminalStages },
        deletedAt: null,
      },
      data: { isOverdue: true }
    })
  }
})
```

---

## 11. Module E — Inspection Workflow

### 11.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/cases/[id]/inspection` | Authenticated | Get inspection (404 if none) |
| POST | `/api/v1/cases/[id]/inspection` | valuer \| field_officer | Create inspection |
| PATCH | `/api/v1/cases/[id]/inspection` | valuer \| field_officer | Update any field while draft |
| POST | `/api/v1/cases/[id]/inspection/submit` | valuer \| field_officer | Submit inspection |
| GET | `/api/v1/cases/[id]/inspection/media` | Authenticated | List media |
| POST | `/api/v1/cases/[id]/inspection/media` | valuer \| field_officer | Get presigned upload URL |
| DELETE | `/api/v1/cases/[id]/inspection/media/[mediaId]` | valuer \| field_officer | Delete media item |

### 11.2 Photo Upload Flow

```typescript
// Step 1: Request presigned URL from API
const { uploadUrl, fileKey, mediaId } = await api.post(
  `/api/v1/cases/${caseId}/inspection/media`,
  { section: 'external_condition', fileType: 'image/jpeg', caption: 'Front facade' }
)

// Step 2: Upload directly to S3 — never proxy through API
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: { 'Content-Type': 'image/jpeg' },
})

// Step 3: Confirm upload
await api.post(
  `/api/v1/cases/${caseId}/inspection/media/${mediaId}/confirm`
)

// Mobile: use expo-image-picker for native camera
import * as ImagePicker from 'expo-image-picker'

const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,  // compress before upload
  base64: false,
})
```

### 11.3 Offline Draft Strategy

```typescript
// Web: IndexedDB via idb-keyval
import { set, get, del } from 'idb-keyval'

const DRAFT_KEY = (caseId: string) => `inspection_draft_${caseId}`

export async function saveOfflineDraft(caseId: string, formState: InspectionFormState) {
  await set(DRAFT_KEY(caseId), {
    data: formState,
    savedAt: new Date().toISOString(),
    synced: false,
  })
}

export async function syncDraftOnReconnect(caseId: string) {
  const draft = await get(DRAFT_KEY(caseId))
  if (draft && !draft.synced) {
    await apiClient.patch(`/api/v1/cases/${caseId}/inspection`, draft.data)
    await del(DRAFT_KEY(caseId))
  }
}

window.addEventListener('online', () => syncDraftOnReconnect(currentCaseId))

// Mobile: MMKV (faster than AsyncStorage, works offline by default)
import { MMKV } from 'react-native-mmkv'
const storage = new MMKV()

export function saveInspectionDraft(caseId: string, formState: InspectionFormState) {
  storage.set(`inspection_draft_${caseId}`, JSON.stringify({
    data: formState,
    savedAt: new Date().toISOString(),
  }))
}
```

### 11.4 Business Logic Rules

| Rule | Detail |
|---|---|
| One inspection per case | Enforced by `@unique` on `Inspection.caseId`. POST returns 409 if exists — use PATCH |
| Submission immutability | Once `status = submitted`, no further PATCH allowed. Reopening requires managing_partner action |
| Stage auto-advance | On submit, if `case.stage = inspection_scheduled`, auto-advance to `inspection_completed` |
| Media size limit | 25MB per image. Enforced via S3 presigned URL Content-Length condition |
| Media types | Accept: `image/jpeg`, `image/png`, `image/heic` only |
| Offline JSONB | `offlineDraft` stores full form state on sync. Merge into structured columns then null the field |

> **Offline merge strategy:** On reconnect, the client sends the full `offlineDraft` JSON via `PATCH /inspection`. The API maps each draft key to its corresponding structured column (e.g. `conditionSummary`, `externalCondition`). Server-side values always win for any field that was updated server-side after the draft was saved — the client timestamp in `offlineDraft.savedAt` is compared to `inspection.updatedAt` to detect stale fields. If stale, the API responds with a `409 CONFLICT` containing both versions, and the client prompts the user to choose. After a successful merge, `offlineDraft` is set to `null`.

---

## 12. Module F — Comparable Evidence Engine

### 12.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/comparables` | Authenticated | Search firm library |
| POST | `/api/v1/comparables` | valuer \| reviewer \| managing_partner | Create comparable |
| GET | `/api/v1/comparables/[id]` | Authenticated | Comparable detail |
| PATCH | `/api/v1/comparables/[id]` | valuer \| reviewer \| managing_partner | Update |
| DELETE | `/api/v1/comparables/[id]` | managing_partner | Soft delete |
| GET | `/api/v1/cases/[id]/comparables` | Authenticated | Case comparables |
| POST | `/api/v1/cases/[id]/comparables` | valuer \| managing_partner | Attach comparable(s) |
| PATCH | `/api/v1/cases/[id]/comparables/[id]` | valuer \| managing_partner | Update relevance/adjustment |
| DELETE | `/api/v1/cases/[id]/comparables/[id]` | valuer \| managing_partner | Detach from case |
| POST | `/api/v1/comparables/import` | managing_partner \| admin | Import from CSV |
| GET | `/api/v1/comparables/import/[jobId]` | Authenticated | Import job status |

### 12.2 Search Query

```typescript
// GET /api/v1/comparables?q=lekki&type=sales&state=Lagos
//   &minPrice=50000000&maxPrice=200000000
//   &dateFrom=2023-01-01&dateTo=2024-12-31

const comparables = await prisma.$queryRaw`
  SELECT c.*,
    ts_rank(search_vector, plainto_tsquery('english', ${q})) as rank
  FROM comparables c
  WHERE c.firm_id = ${firmId}
    AND c.deleted_at IS NULL
    ${q ? Prisma.sql`AND c.search_vector @@ plainto_tsquery('english', ${q})` : Prisma.empty}
    ${type ? Prisma.sql`AND c.comparable_type = ${type}` : Prisma.empty}
    ${state ? Prisma.sql`AND c.state ILIKE ${state}` : Prisma.empty}
    ${minPrice ? Prisma.sql`AND c.price_amount >= ${minPrice}` : Prisma.empty}
    ${maxPrice ? Prisma.sql`AND c.price_amount <= ${maxPrice}` : Prisma.empty}
  ORDER BY ${q ? Prisma.sql`rank DESC,` : Prisma.empty} evidence_date DESC
  LIMIT ${pageSize} OFFSET ${offset}
`
```

### 12.3 CSV Import Pipeline

```typescript
// Trigger.dev background job

export const importComparables = trigger.defineJob({
  id: 'import-comparables',
  name: 'Import Comparables from CSV',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'comparables.import' }),
  run: async (payload: { jobId: string; firmId: string; fileKey: string }, io) => {
    // Download CSV from S3
    const csvContent = await downloadFromS3(payload.fileKey)
    const rows = parseCSV(csvContent)

    const results = { imported: 0, failed: 0, errors: [] as ImportError[] }

    // Process in batches of 100
    for (const batch of chunk(rows, 100)) {
      for (const row of batch) {
        try {
          await validateImportRow(row)
          await prisma.comparable.create({
            data: {
              firmId: payload.firmId,
              comparableType: row.comparable_type,
              address: row.address,
              city: row.city,
              state: row.state,
              priceAmount: parseFloat(row.price_amount),
              evidenceDate: new Date(row.evidence_date),
              source: row.source,
              sourceType: 'imported',
              confidenceLevel: parseInt(row.confidence_level || '3'),
              createdById: payload.createdById,
            }
          })
          results.imported++
        } catch (e) {
          results.failed++
          results.errors.push({ row: row._rowNumber, error: e.message })
        }
      }
    }

    await prisma.comparableImportJob.update({
      where: { id: payload.jobId },
      data: {
        status: results.failed > 0 ? 'partial_failure' : 'complete',
        importedCount: results.imported,
        failedCount: results.failed,
        errors: results.errors,
      }
    })
  }
})
```

### 12.4 Business Logic Rules

| Rule | Detail |
|---|---|
| Relevance score | Stored on `CaseComparable`, not `Comparable`. Same comparable can score 5 on one case and 2 on another |
| `ratePerSqm` | Computed on save: `priceAmount / sizeSqm`. Null if `sizeSqm` is null |
| Soft delete | Deleted comparables preserved on existing `CaseComparable` records. Show as `[deleted comparable]` in UI |
| Import source | CSV imports set `sourceType = imported`. Never silently default to `other` |

---

## 13. Module G — Valuation Workbench

### 13.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/cases/[id]/analysis` | Authenticated | Get analysis (404 if none) |
| POST | `/api/v1/cases/[id]/analysis` | valuer \| managing_partner | Create analysis |
| PATCH | `/api/v1/cases/[id]/analysis` | valuer \| managing_partner | Update any field |
| POST | `/api/v1/cases/[id]/analysis/complete` | valuer \| managing_partner | Mark complete — gates report generation |

### 13.2 Comparable Grid Payload

```typescript
// GET /api/v1/cases/[id]/comparables returns full comparable data
// for the side-by-side grid in the workbench

interface CaseComparableGridItem {
  id: string                  // case_comparable id
  comparableId: string
  address: string
  comparableType: 'sales' | 'rental' | 'land'
  propertyType: string | null
  sizeSqm: number | null
  priceAmount: number | null
  ratePerSqm: number | null   // key metric for comparison
  evidenceDate: string
  source: string
  confidenceLevel: number
  // Case-specific fields
  relevanceScore: number
  adjustmentNotes: string | null
  weight: number | null
}
```

### 13.3 Assumptions Schema

```typescript
// assumptions and specialAssumptions are JSONB arrays
// Each assumption has a stable UUID for future clause library reuse

interface Assumption {
  id: string       // UUID — stable for clause library in Phase 2
  text: string
}

// Example payload on PATCH:
{
  assumptions: [
    { id: 'uuid-1', text: 'The property is assumed to be free from contamination.' },
    { id: 'uuid-2', text: 'Title is assumed to be good and marketable.' },
  ],
  specialAssumptions: [
    { id: 'uuid-3', text: 'Valued as if planning permission has been granted.' },
  ]
}
// Send full array on each save — replace, not delta
```

### 13.4 Business Logic Rules

| Rule | Detail |
|---|---|
| One analysis per case | Enforced by `@unique` on `ValuationAnalysis.caseId` |
| Completion gate | `POST /complete` validates: method set, basisOfValue set, concludedValue > 0, dateOfValuation set |
| Value change audit | On PATCH, if `concludedValue` changes, write to `AuditLog`: `action = concluded_value_changed` |
| Method values | `comparison`, `investment`, `residual`, `contractors`, `profits` — enum only, no free text |
| Analysis after report | If analysis edited after a report exists, surface warning to user. Do not auto-invalidate the report |

---

## 14. Module H — Report Generator

### 14.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/cases/[id]/reports` | Authenticated | List all report versions |
| POST | `/api/v1/cases/[id]/reports/generate` | valuer \| managing_partner | Trigger generation (async) |
| GET | `/api/v1/cases/[id]/reports/[id]` | Authenticated | Report detail |
| GET | `/api/v1/cases/[id]/reports/[id]/pdf` | Authenticated | Presigned S3 PDF URL |
| PATCH | `/api/v1/cases/[id]/reports/[id]` | valuer \| managing_partner | Update status |
| GET | `/api/v1/report-templates` | Authenticated | List firm templates |
| POST | `/api/v1/report-templates` | managing_partner \| admin | Create template |
| PATCH | `/api/v1/report-templates/[id]` | managing_partner \| admin | Update template |

### 14.2 Report Generation Pipeline

```typescript
// Trigger.dev job — triggered by POST /generate
// Never block the API response for PDF generation

export const generateReport = trigger.defineJob({
  id: 'generate-report',
  name: 'Generate Valuation Report',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'report.generate' }),
  run: async (payload: { caseId: string; firmId: string; userId: string }, io) => {

    const caseData = await prisma.case.findFirst({
      where: { id: payload.caseId, firmId: payload.firmId },
      include: {
        client: true,
        property: true,
        assignedValuer: true,
        assignedReviewer: true,
        inspection: { include: { media: true } },
        caseComparables: { include: { comparable: true } },
        analysis: true,
        firm: true,
      }
    })

    const template = await prisma.reportTemplate.findFirst({
      where: {
        firmId: payload.firmId,
        valuationType: caseData!.valuationType,
        isActive: true,
      }
    })

    // Build template context
    const context = buildReportContext(caseData!, template!)

    // Render HTML via Handlebars
    const html = Handlebars.compile(template!.templateHtml)(context)

    // Generate PDF via Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    })
    await browser.close()

    // Upload to S3
    const fileKey = `reports/${payload.firmId}/${payload.caseId}/${randomUUID()}.pdf`
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }))

    // Create new report version
    const versionCount = await prisma.report.count({
      where: { caseId: payload.caseId }
    })

    await prisma.report.create({
      data: {
        caseId: payload.caseId,
        firmId: payload.firmId,
        templateId: template!.id,
        versionNumber: versionCount + 1,
        status: 'draft',
        renderedHtml: html,
        pdfFileKey: fileKey,
        generatedById: payload.userId,
      }
    })
  }
})
```

### 14.3 Template Merge Fields (Handlebars)

| Field | Value |
|---|---|
| `{{firm.name}}` | Firm legal or trading name |
| `{{firm.logoUrl}}` | Firm logo URL for `<img>` tag |
| `{{case.reference}}` | Case reference number |
| `{{case.valuationTypeDisplay}}` | Human-readable valuation type |
| `{{case.dateOfValuation}}` | From `analysis.dateOfValuation` |
| `{{client.displayName}}` | Client name |
| `{{property.fullAddress}}` | Computed full address string |
| `{{property.propertyTypeDisplay}}` | Human-readable property type |
| `{{property.sizeSqm}}` | Property size in sqm |
| `{{property.tenureDisplay}}` | Human-readable tenure |
| `{{inspection.conditionSummary}}` | Overall condition note |
| `{{inspection.inspectionDate}}` | Date of inspection |
| `{{inspection.inspector.fullName}}` | Inspector's name |
| `{{#each comparables}}` | Iterate over selected comparables |
| `{{analysis.methodDisplay}}` | Human-readable methodology |
| `{{analysis.basisOfValueDisplay}}` | Human-readable basis |
| `{{#each analysis.assumptions}}` | Iterate assumption items |
| `{{analysis.concludedValue \| currency}}` | Formatted NGN value |
| `{{analysis.commentary}}` | Analytical narrative |
| `{{#each template.defaultDisclaimers}}` | Iterate disclaimer items |
| `{{valuer.fullName}}` | Assigned valuer |
| `{{reviewer.fullName}}` | Assigned reviewer |

### 14.4 Business Logic Rules

| Rule | Detail |
|---|---|
| Generation pre-conditions | `analysis.status = complete`. At least one comparable attached. Inspection submitted. Return 400 if any fail |
| Version immutability | Each generation creates a new row. `renderedHtml` and `pdfFileKey` are never overwritten |
| PDF presigned URL TTL | 15 minutes. Never expose S3 key directly. Always generate fresh URL on PDF download request |
| Status transitions | `draft → under_review → approved → issued`. No backwards transitions except via managing_partner reset |
| Issue gate | Cannot issue if any `ReviewComment` with `severity = blocking` and `status = open` exists for this report version |
| Template HTML safety | Strip all `<script>` tags from template HTML on save |

---

## 15. Module I — Review, QA and Compliance

### 15.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/cases/[id]/reports/[id]/comments` | Authenticated | List comments |
| POST | `/api/v1/cases/[id]/reports/[id]/comments` | senior_reviewer \| managing_partner | Add comment |
| PATCH | `/api/v1/cases/[id]/reports/[id]/comments/[cid]` | valuer \| managing_partner | Resolve comment |
| POST | `/api/v1/cases/[id]/reports/[id]/approve` | senior_reviewer \| managing_partner | Approve report |
| POST | `/api/v1/cases/[id]/reports/[id]/reject` | senior_reviewer \| managing_partner | Reject — return to draft |
| POST | `/api/v1/cases/[id]/reports/[id]/issue` | senior_reviewer \| managing_partner | Issue report |
| GET | `/api/v1/audit-logs` | managing_partner | Firm audit log |
| GET | `/api/v1/audit-logs?entityId=[id]` | managing_partner | Audit log for entity |

### 15.2 Business Logic Rules

| Rule | Detail |
|---|---|
| Approve pre-condition | No unresolved `blocking` comments. Return 400 with blocking comment IDs if any exist |
| Issue pre-condition | `report.status = approved`. Write `issuedAt` timestamp. Advance case stage |
| Comment resolution | Only the assigned valuer or managing partner can resolve a comment. Reviewer cannot self-resolve |
| Audit log immutability | `AuditLog` rows have no UPDATE or DELETE. Enforce at application layer — never expose update/delete endpoints for this model |
| Required fields before issue | `inspection.status = submitted`, at least one comparable, `analysis.concludedValue` set, `analysis.basisOfValue` set |

### 15.3 Audit Log Writes

```typescript
// Always write audit logs via Trigger.dev — never block the request

export const writeAuditLog = trigger.defineJob({
  id: 'write-audit-log',
  name: 'Write Audit Log Entry',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'audit.write' }),
  run: async (payload: AuditPayload) => {
    await prisma.auditLog.create({
      data: {
        firmId: payload.firmId,
        userId: payload.userId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        action: payload.action,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
        ipAddress: payload.ipAddress,
      }
    })
  }
})

// Usage in route handlers — fire and forget
await trigger.sendEvent({
  name: 'audit.write',
  payload: {
    firmId: req.firmId,
    userId: req.userId,
    entityType: 'report',
    entityId: reportId,
    action: 'report_issued',
    newValue: { status: 'issued', issuedAt: new Date() },
  }
})
```

---

## 16. Module J — Billing and Finance

### 16.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/invoices` | finance \| managing_partner | List with filters |
| POST | `/api/v1/invoices` | finance \| admin \| managing_partner | Create invoice |
| GET | `/api/v1/invoices/[id]` | finance \| managing_partner | Invoice detail |
| PATCH | `/api/v1/invoices/[id]` | finance \| managing_partner | Update fields |
| POST | `/api/v1/invoices/[id]/issue` | finance \| managing_partner | Mark issued |
| POST | `/api/v1/invoices/[id]/mark-paid` | finance \| managing_partner | Mark paid |
| POST | `/api/v1/invoices/[id]/void` | managing_partner | Void invoice |
| GET | `/api/v1/dashboard/revenue` | finance \| managing_partner | Revenue metrics |

### 16.2 Business Logic Rules

| Rule | Detail |
|---|---|
| One invoice per case (MVP) | Enforced at application layer. `@unique` on `Invoice.caseId` |
| Total amount | `amount + taxAmount`. Computed in application layer before storage |
| Status transitions | `draft → issued → partial \| paid`. Void at draft or issued only |
| Stage auto-advance on issue | When invoice issued → if `case.stage = final_issued`, auto-advance to `invoice_sent` |
| Stage auto-advance on paid | When invoice paid → if `case.stage = invoice_sent`, auto-advance to `payment_received` |

---

## 17. Module K — Dashboard and Analytics

### 17.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | Authenticated | Role-aware summary metrics |
| GET | `/api/v1/dashboard/cases-by-stage` | Authenticated | Case counts by stage |
| GET | `/api/v1/dashboard/overdue-cases` | Authenticated | Overdue case list |
| GET | `/api/v1/dashboard/revenue` | finance \| managing_partner | Revenue metrics |
| GET | `/api/v1/dashboard/comparables` | Authenticated | Library growth stats |
| GET | `/api/v1/dashboard/turnaround` | managing_partner | Avg turnaround metrics |

### 17.2 Role-Aware Response

```typescript
// GET /api/v1/dashboard/summary

// managing_partner response:
{
  openCases: 24,
  overdueCases: 3,
  casesByStage: { enquiry_received: 4, case_opened: 8, draft_report: 6, review: 3, ... },
  revenuePipeline: 4500000,
  unpaidInvoices: 1200000,
  comparableCount: 847,
  avgTurnaroundDays: 12.4
}

// valuer response (own cases only):
{
  assignedToMe: 6,
  overdueAssigned: 1,
  myCasesByStage: { inspection_scheduled: 2, comparable_analysis: 2, draft_report: 2 },
  inspectionsDue: 2
}

// finance response:
{
  unpaidInvoices: 1200000,
  paidThisMonth: 3400000,
  invoicesOverdue: 2,
  outstandingCount: 7
}
```

### 17.3 Caching Strategy

```typescript
// Redis cache via Upstash
// Key: dashboard:{firmId}:{role}
// TTL: 60 seconds

async function getDashboardSummary(firmId: string, role: UserRole) {
  const cacheKey = `dashboard:${firmId}:${role}`

  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const data = await computeDashboardSummary(firmId, role)
  await redis.setex(cacheKey, 60, JSON.stringify(data))
  return data
}

// Invalidate on relevant changes via Trigger.dev event
export const invalidateDashboardCache = trigger.defineJob({
  id: 'invalidate-dashboard-cache',
  trigger: eventTrigger({ name: 'dashboard.invalidate' }),
  run: async (payload: { firmId: string }) => {
    // Use SCAN instead of KEYS to avoid blocking Redis on large keyspaces
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor, 'MATCH', `dashboard:${payload.firmId}:*`, 'COUNT', 100
      )
      cursor = parseInt(nextCursor)
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== 0)
  }
})
```

---

## 18. Module L — Document Management

### 18.1 API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/documents` | Authenticated | Search document library |
| POST | `/api/v1/documents` | Authenticated | Create record + get presigned upload URL |
| GET | `/api/v1/documents/[id]` | Authenticated | Detail + fresh download URL |
| PATCH | `/api/v1/documents/[id]` | Authenticated | Update title, category, tags |
| DELETE | `/api/v1/documents/[id]` | managing_partner \| admin | Soft delete |
| POST | `/api/v1/documents/confirm` | Authenticated | Confirm S3 upload complete |

### 18.2 Business Logic Rules

| Rule | Detail |
|---|---|
| Link requirement | At least one of `caseId`, `propertyId`, `clientId` must be non-null |
| Soft delete | Sets `deletedAt`. Schedule S3 object deletion via Trigger.dev after 30 days |
| Max file size | 50MB per document. Enforced via S3 presigned URL Content-Length condition |
| Allowed MIME types | `application/pdf`, `application/vnd.openxmlformats...docx`, `image/jpeg`, `image/png`, `application/vnd.ms-excel`, `application/vnd.openxmlformats...xlsx` |

---

## 19. Mobile App — Platform Strategy

### 19.1 Feature Split — Web vs Mobile

| Feature | Web | Mobile | Notes |
|---|---|---|---|
| Dashboard | Full | Summary view | Mobile shows key metrics only |
| Case list | Full | Full | Core for all roles |
| Case detail | Full | Full | Tab navigation on mobile |
| Inspection form | Responsive | Full native | Mobile is primary device |
| Photo capture | File upload | Native camera | Significant UX advantage |
| Comparables library | Full | View + add | Heavy search stays web |
| Analysis workbench | Full | View only | Complex grid needs desktop |
| Report generation | Full | Trigger only | Generation stays server-side |
| Report review | Full | Approve/reject | Simplified on mobile |
| Report download | Full | Native PDF viewer | |
| Invoice management | Full | View + status | Creation stays web |
| Documents | Full | Upload + view | Native file picker |
| Push notifications | Web push | Native APNs/FCM | Mobile is primary channel |
| Settings / Admin | Full | Profile only | Admin stays web |

### 19.2 Mobile Navigation Structure

```
apps/mobile/app/
├── (auth)/
│   └── login.tsx
├── (tabs)/
│   ├── _layout.tsx         ← Tab bar: Dashboard, Cases, Inspect, Alerts
│   ├── dashboard/
│   │   └── index.tsx       ← Summary metrics
│   ├── cases/
│   │   ├── index.tsx       ← Cases list
│   │   ├── [id]/
│   │   │   ├── index.tsx   ← Case detail (tabs)
│   │   │   ├── inspection.tsx
│   │   │   ├── comparables.tsx
│   │   │   ├── reports.tsx
│   │   │   └── documents.tsx
│   │   └── new.tsx         ← Create case
│   ├── inspect/
│   │   └── [caseId].tsx    ← Full-screen inspection form
│   └── notifications/
│       └── index.tsx
└── _layout.tsx             ← Root layout + auth guard
```

### 19.3 Push Notifications Setup

```typescript
// apps/mobile/lib/notifications.ts

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  })).data

  // Register token with backend
  await apiClient.post('/api/v1/users/push-token', { token })
  return token
}

// Handle notification tap → navigate to relevant screen
Notifications.addNotificationResponseReceivedListener(response => {
  const { entityType, entityId } = response.notification.request.content.data
  if (entityType === 'case') router.push(`/cases/${entityId}`)
  if (entityType === 'report') router.push(`/cases/${response.notification.request.content.data.caseId}/reports`)
})
```

### 19.4 Mobile Inspection — Native Camera

```typescript
// apps/mobile/components/inspection/PhotoCapture.tsx

import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'

export function PhotoCapture({ section, caseId, inspectionId }: Props) {
  const [uploading, setUploading] = useState(false)

  async function capturePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,        // compress to ~800KB typically
      allowsEditing: false,
      exif: false,         // strip EXIF for privacy
    })

    if (result.canceled) return

    setUploading(true)
    try {
      // Get presigned URL
      const { uploadUrl, mediaId } = await apiClient.post(
        `/api/v1/cases/${caseId}/inspection/media`,
        { section, fileType: 'image/jpeg', caption: '' }
      )

      // Upload to S3
      await FileSystem.uploadAsync(uploadUrl, result.assets[0].uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      })

      // Confirm
      await apiClient.post(
        `/api/v1/cases/${caseId}/inspection/media/${mediaId}/confirm`
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <TouchableOpacity onPress={capturePhoto} disabled={uploading}>
      {uploading ? <ActivityIndicator /> : <CameraIcon />}
    </TouchableOpacity>
  )
}
```

---

## 20. Cross-Cutting Concerns

### 20.1 Notifications

| Trigger | Event | Recipients |
|---|---|---|
| Daily 07:00 WAT | Cases with `isOverdue = true` | Assigned valuer + managing partner |
| Report status → `under_review` | Report pending review | Assigned reviewer |
| Blocking comment created | Unresolved blocking comment | Assigned valuer |
| Invoice `dueDate < today` and `status != paid` | Invoice overdue | Finance officers + managing partner |

```typescript
// Notification polling (web)
// GET /api/v1/notifications/unread-count → { count: 3 }
// Poll every 30 seconds — lightweight endpoint

// Full notification list
// GET /api/v1/notifications?isRead=false

// Mark read
// POST /api/v1/notifications/[id]/read
// POST /api/v1/notifications/read-all
```

### 20.2 Pagination

All list endpoints are paginated. Default page size: 25. Maximum: 100.

```typescript
// Standard paginated response
{
  status: 'ok',
  data: [...items],
  meta: {
    count: 142,
    page: 1,
    pageSize: 25,
    totalPages: 6,
    next: '/api/v1/cases?page=2',
    previous: null,
  }
}
```

### 20.3 Input Validation (Zod — shared package)

```typescript
// packages/utils/validators.ts — used by both web forms and API routes

import { z } from 'zod'

export const CreateCaseSchema = z.object({
  clientId:          z.string().uuid(),
  propertyId:        z.string().uuid(),
  valuationType:     z.enum(['market','rental','mortgage','insurance','probate','commercial','land']),
  valuationPurpose:  z.string().max(200).optional(),
  assignedValuerId:  z.string().uuid(),
  assignedReviewerId:z.string().uuid().optional(),
  dueDate:           z.string().datetime().optional(),
  feeAmount:         z.number().positive().optional(),
  internalNotes:     z.string().max(2000).optional(),
})

export const CreateComparableSchema = z.object({
  comparableType: z.enum(['sales', 'rental', 'land']),
  address:        z.string().min(5).max(400),
  city:           z.string().max(100).optional(),
  state:          z.string().max(100).optional(),
  priceAmount:    z.number().positive().optional(),
  sizeSqm:        z.number().positive().optional(),
  evidenceDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
                    .refine(d => new Date(d) <= new Date(), 'Evidence date cannot be in the future'),
  source:         z.string().min(2).max(200),
  sourceType:     z.enum(['firm_survey','agent','published','imported','other']),
  confidenceLevel:z.number().int().min(1).max(5).default(3),
})
```

### 20.4 Rate Limiting

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 per IP per 15 minutes |
| `POST /auth/password/reset` | 3 per email per hour |
| File upload presign | 50 per user per hour |
| CSV import | 3 concurrent per firm |
| General API | 300 per user per minute |

### 20.5 Security Requirements

| Requirement | Implementation |
|---|---|
| CORS | Whitelist allowed origins explicitly. Never `*` in production |
| CSRF | `SameSite=Strict` on JWT cookies. CSRF tokens for form submissions |
| SQL injection | Prisma ORM exclusively. Never interpolate user input into raw SQL |
| XSS | Sanitise all user input. Strip HTML from text fields via `sanitize-html` |
| IDOR | Always `firmId + recordId` — never look up by ID alone |
| Secrets | Environment variables only. Never in code or version control |
| S3 bucket | No public read access. All access via presigned URLs only |
| HTTPS | Enforced everywhere. HSTS `max-age=31536000, includeSubDomains` |

---

## 21. Error Handling Reference

| HTTP | Code | When to Use |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body fails field validation — return per-field errors |
| 400 | `INVALID_STATE` | Stage machine violation or pre-condition not met |
| 400 | `DUPLICATE_RECORD` | Unique constraint violated (e.g. second inspection for a case) |
| 401 | `AUTHENTICATION_REQUIRED` | No valid token provided |
| 401 | `TOKEN_EXPIRED` | Access token expired — client should refresh |
| 403 | `PERMISSION_DENIED` | User role lacks required permission |
| 403 | `TENANT_MISMATCH` | Requested resource belongs to a different firm |
| 404 | `NOT_FOUND` | Resource does not exist or is soft deleted |
| 409 | `CONFLICT` | Resource already exists where only one is allowed |
| 413 | `FILE_TOO_LARGE` | Upload exceeds size limit |
| 415 | `UNSUPPORTED_MEDIA` | File type not in allowed list |
| 429 | `RATE_LIMITED` | Rate limit exceeded — include `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Unexpected server error — log full trace, return generic message |
| 503 | `SERVICE_UNAVAILABLE` | PDF generation or S3 temporarily unavailable |

---

## 22. Performance Targets

| Operation | Target | How to Enforce |
|---|---|---|
| Inspection form load (3G mobile) | < 4 seconds | Lighthouse throttled — Sprint 8 exit criterion |
| All search queries | < 1.5 seconds | GIN indexes + Redis cache on hot queries |
| PDF report export | < 10 seconds | Puppeteer async via Trigger.dev — show progress |
| Dashboard load | < 3 seconds | Redis 60s TTL cache per firm + role |
| API list endpoints | < 800ms p95 | Paginated, indexed, no N+1 queries |
| Auth endpoints | < 300ms | No heavy joins on token validation |

### 22.1 N+1 Query Prevention

```typescript
// BAD — N+1 on case list
const cases = await prisma.case.findMany({ where: { firmId } })
// Each access to case.client triggers a separate query

// GOOD — single query with joins
const cases = await prisma.case.findMany({
  where: { firmId },
  include: {
    client: { select: { id: true, displayName: true } },
    property: { select: { id: true, addressLine1: true, city: true } },
    assignedValuer: { select: { id: true, firstName: true, lastName: true } },
    _count: { select: { caseComparables: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: pageSize,
  skip: offset,
})
```

### 22.2 Pre-Pilot Database Index Checklist

Before pilot launch, verify these indexes exist via `EXPLAIN ANALYZE` on the five most frequent queries:

- [ ] `cases(firmId, stage)`
- [ ] `cases(firmId, isOverdue)`
- [ ] `cases(firmId, assignedValuerId)`
- [ ] `comparables(firmId)` + `GIN(searchVector)`
- [ ] `notifications(userId, isRead)`
- [ ] `auditLogs(firmId, entityType, entityId)`
- [ ] `invoices(firmId, status)`

---

## 23. Sprint Plan

### Planning Assumptions

- 2-week sprints
- Small team (2–3 engineers)
- Turborepo monorepo from Sprint 0
- Shared packages built before features — pays off from Sprint 4 onward
- Pilot gate items are non-negotiable exit criteria

### Delivery Summary

| Sprint | Focus | Status |
|---|---|---|
| 0 | Monorepo setup, TailAdmin layout extraction, design tokens, DB, auth strategy, shared packages | Foundation |
| 1 | Auth, firms, users, permissions — web + mobile auth screens | Core |
| 2 | Clients, properties, dashboard shell — web + mobile scaffold | Core |
| 3 | Case management — web full, mobile case list + detail | Core |
| 4 | Inspection workflow — web responsive, mobile native camera + offline save | **Pilot gate** |
| 5 | Comparable engine — web full, mobile view + add, CSV import | **Pilot gate** |
| 6a | Analysis workbench + report template design — web only | Core |
| 6b | PDF generation, report versioning, report status — web + mobile approve/reject | Core |
| 7 | Review, QA, compliance, push notifications — web + mobile | Core |
| 8 | Billing, documents, hardening, performance validation, pilot prep | **Pilot gate** |

### Sprint 0 — Foundation

**Deliverables:**
- Turborepo monorepo scaffold with `apps/web`, `apps/mobile`, `packages/types`, `packages/api`, `packages/utils`
- TailAdmin free repo cloned locally as reference — sidebar, navigation shell, page wrapper, and breadcrumb components extracted into `apps/web/components/layout/`
- Design tokens from Section 4.5 applied to `apps/web/app/globals.css`
- shadcn/ui initialised in `apps/web` — `dialog`, `command`, `popover`, `dropdown-menu` components installed
- PostgreSQL running with Prisma schema and initial migrations
- Auth strategy implemented and tested
- Expo app shell boots and connects to API
- S3 bucket configured with presigned URL pattern tested
- Trigger.dev project created with one test job running

**Exit criteria:**
- Turborepo monorepo runs locally with `turbo dev`
- `packages/types`, `packages/api`, `packages/utils` scaffold created and importable from both apps
- Brand design tokens applied — sidebar and nav shell renders with correct Valuation OS colours
- TailAdmin dashboard shell visible at `localhost:3000/dashboard` with placeholder widgets
- PostgreSQL running with Prisma migrations
- Auth flow (login → JWT → protected route) working end-to-end
- Expo app shell boots and connects to API
- S3 presigned upload tested successfully
- Trigger.dev test job fires and completes

### Sprint 1 — Auth, Firms, Users, Permissions

**Exit criteria:**
- Admin can invite users without developer involvement
- Roles correctly restrict access to permitted screens
- Web login and mobile login both working against same API
- JWT refresh flow tested

### Sprint 2 — Clients, Properties, Dashboard Shell

**Exit criteria:**
- Client and property CRUD working on web
- Search returns results in under 1.5s
- Dashboard shell loads with role-aware widgets
- Mobile: cases list screen functional (data from shared hook)
- Empty states designed and implemented on all list screens

### Sprint 3 — Case Management

**Exit criteria:**
- Full case creation → stage tracking working end-to-end on web
- Stage transitions enforce pre-conditions correctly
- Overdue cases flagged via scheduled job
- Dashboard reflects live case counts
- Mobile: case list + case detail with tab navigation

### Sprint 4 — Inspection Workflow *(Pilot Gate)*

**Exit criteria:**
- Inspection form completes end-to-end on web (mobile-responsive)
- Mobile: native camera integration working — photos attach to correct section
- Offline save tested: data entered without connectivity syncs on reconnect
- Inspection form loads in under 4s on throttled 3G (Lighthouse)
- Section-by-section progressive save confirmed working

### Sprint 5 — Comparable Engine *(Pilot Gate)*

**Exit criteria:**
- Comparable CRUD and search working on web
- Comparable reuse across multiple cases confirmed
- CSV import pipeline complete — test with real-format file of 200+ rows
- Empty comparables library shows import prompt prominently
- Mobile: view comparables, add comparable from case detail

### Sprint 6a — Analysis Workbench + Template Design

**Exit criteria:**
- Workbench complete with comparable side-by-side grid
- All 7 report template types designed and reviewed against real firm output
- Auto-population mapping confirmed for all core fields
- Individual line-item assumptions working (not single text block)
- Completed value change writes to audit log

### Sprint 6b — Report Generation + PDF Export

**Exit criteria:**
- Report generates from case data without re-entering information
- PDF export completes in under 10 seconds
- PDF output is professionally formatted — reviewed by at least one pilot firm contact
- Report versioning: regeneration creates new version, not overwrite
- Mobile: report approve/reject flow working

### Sprint 7 — Review, QA, Compliance, Notifications

**Exit criteria:**
- Blocking comments prevent Approve action visually and at API level
- Audit log entries are immutable and visible to managing partner
- Required field validation enforced before issue
- In-app notifications working for all four trigger types
- Mobile: push notifications received and tapping navigates to correct screen

### Sprint 8 — Billing, Documents, Hardening *(Pilot Gate)*

**Exit criteria:**
- Invoice creation from case in under 60 seconds
- Invoice status auto-advances case stage correctly
- Document upload and search working
- All performance targets validated with measurement:
  - Inspection form < 4s on 3G ✓
  - Search < 1.5s ✓
  - PDF export < 10s ✓
  - Dashboard < 3s ✓
- Onboarding guide available
- Mobile: document upload via native file picker working

### Pilot Readiness Checklist

- [ ] At least 2 user roles tested end-to-end
- [ ] Full case flow: instruction → inspection → comparables → analysis → report → approval → invoice
- [ ] Offline inspection save and sync tested and confirmed
- [ ] Comparable CSV import tested with a real-format file
- [ ] Comparable reuse demonstrated across at least 2 different cases
- [ ] Report PDF professionally formatted for at least 3 template types
- [ ] Blocking comment prevents issue until resolved
- [ ] Push notifications received on mobile device
- [ ] Invoices auto-advance case stage correctly
- [ ] All performance targets met and measured
- [ ] Empty states on all list and library screens
- [ ] Onboarding guide reviewed by pilot firm contact

---

### Post-MVP Backlog

**v1.5 — Operational Maturity**
- Shared comparable library enhancements (endorsement, confidence review)
- Branch dashboards and branch-level analytics
- Email notification layer
- Report version comparison view
- Reusable assumptions and disclaimer clause library
- Import tools for legacy case and client data
- Advanced audit trail: full old/new value diff per change

**v2 — Intelligence and Ecosystem**
- AI-assisted report drafting
- Smart comparable suggestions
- Regional market benchmark dashboards
- Client portal (submit instructions, view status, download reports)
- Lender and developer module
- API layer and external integrations
- Multi-firm comparable benchmarking

---

*Valuation OS — Functionality Bible — v3.0*  
*This document is the authoritative build reference. All API behaviour, database schema, business logic rules, and UI foundation decisions in this document take precedence over earlier versions in case of conflict.*