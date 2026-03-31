# Valuation OS — Current Functionality Bible

This document explains the product as it exists today in this repository.

- [project-docs.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/project-docs.md) remains the broader target specification
- this guide is the current-state operational manual for the implemented platform
- it is written for founders, operators, reviewers, finance staff, and implementation partners who need to understand how the system actually works today

## 1. What The Product Is

Valuation OS is a multi-tenant operating system for estate surveying and valuation firms.

It combines:

- a web control plane for office operations
- a mobile app for field execution
- a shared API, shared business rules, and a shared PostgreSQL data model

At a practical level, the platform now covers the full working chain from:

`client -> property -> case -> inspection -> comparables -> analysis -> report -> review -> invoice -> dashboard`

## 2. Core Product Model

The main records in the system are:

- `Firm`
  the tenant boundary
- `Branch`
  the operating unit inside a firm
- `User`
  a staff member with a role and optional branch scope
- `Client`
  the customer relationship record
- `Property`
  the property registry record
- `Case`
  the master instruction/work item
- `Inspection`
  the field inspection record linked to a case
- `Comparable`
  reusable market evidence in the firm library
- `CaseComparable`
  a comparable after it has been attached to a specific case
- `Analysis`
  the valuation workbench record for a case
- `Report`
  the generated draft/final valuation document
- `Invoice`
  the billing record linked to a case
- `Document`
  signed uploads and linked working files across cases, clients, and properties
- `Notification`
  workflow alerts for web and mobile
- `AuditLog`
  the operational history trail

## 3. Tenant And Branch Rules

The hard security boundary is the firm.

- every business record belongs to a `firmId`
- branches are internal operating units inside the same firm
- `managing_partner` is firm-wide by design
- other users are typically branch-scoped
- branch scoping affects CRM visibility, case access, documents, comparables, and operational dashboards

The result is:

- one firm can operate multiple branches safely
- data reuse still happens inside the firm
- managing partners keep cross-branch oversight

## 4. Roles And Responsibilities

| Role | Main Platform | Core Responsibility |
| --- | --- | --- |
| Managing Partner | Web | Oversight, assignments, approvals, reports, finance visibility |
| Admin / Operations | Web | Team management, workflow support, branch operations |
| Valuer | Web + Mobile | Case handling, analysis, report preparation, inspections when needed |
| Reviewer | Web | Review comments, approval, compliance checks |
| Finance | Web | Invoice creation, issue, payment tracking, receivables monitoring |
| Field Officer | Mobile | Inspection execution, photos, field notes, document capture |

## 5. Platform Split

### Web

The web app is the control plane.

It is used for:

- team and firm administration
- CRM and client management
- property registry
- case creation and lifecycle management
- inspection review
- comparable library management
- valuation analysis
- report generation and review
- finance workflows
- dashboards, audit, and documents

### Mobile

The mobile app is the field execution layer.

It is used for:

- login and secure session access
- dashboard snapshot
- case review in the field
- inspection drafting and submission
- photo upload and offline retry queues
- notification receipt and deep-link entry points
- case-linked document upload and opening
- comparable lookup/quick attach from case context

## 6. Module Breakdown

## Module A — Authentication, Firm, Team

What it does:

- sign up a firm
- login, logout, refresh, password reset
- invite and activate staff
- manage roles and branch assignment
- maintain firm profile
- support both web and mobile authentication

Key outcomes:

- secure JWT-based session model
- rotating refresh tokens
- branch-aware user administration
- mobile auth guard and profile/password flows

## Module B — CRM And Contact Management

What it does:

- create and manage clients
- support individual and corporate records
- attach tags and relationship notes
- detect likely duplicates
- archive and restore clients
- manage multiple contacts per client
- assign client ownership to a branch

Key outcomes:

- branch-aware CRM
- reusable client records across cases
- cleaner intake quality before case creation

## Module C — Property Registry

What it does:

- create and manage properties
- capture property type, use, location, and notes
- search and filter the property register
- archive and restore properties
- surface nearby comparable suggestions

Key outcomes:

- reusable property registry for case intake
- stronger property identity before valuation work starts

## Module D — Case And Instruction Management

What it does:

- create a case from a client + property instruction
- assign valuer and reviewer
- set due date, fee, and internal notes
- manage checklist items
- move cases through the stage flow
- surface case activity history

Key outcomes:

- one master operating record per valuation instruction
- stage-driven execution from intake through payment

## Module E — Inspection Workflow

What it does:

- schedule inspections
- capture occupancy, condition, services, notes, and summary
- upload and manage inspection photos
- submit inspections with readiness checks
- prevent editing after final submission

Key outcomes:

- real field evidence capture
- server-enforced submission quality rules
- signed upload/download flow for inspection media

## Module F — Comparable Evidence Engine

What it does:

- create comparables manually
- import comparables by CSV
- search the firm comparable library
- attach comparables to a case
- assign case-specific weight, relevance, and adjustment
- support quick attach from mobile case context

Key outcomes:

- one reusable evidence library per firm
- separate raw market evidence from case-specific judgment

## Module G — Valuation Workbench

What it does:

- store assumptions and special assumptions
- capture concluded value and valuation basis
- persist a comparable grid snapshot
- calculate weighted signals from attached evidence
- record reconciliation commentary explaining the conclusion

Key outcomes:

- the valuer can move from evidence collection to a reasoned value conclusion
- the workbench produces structured data that feeds reporting

## Module H — Report Generator

What it does:

- generate report drafts from case context
- use either built-in or firm-specific templates
- preview rendered HTML
- download HTML
- print/save to PDF via the browser
- submit reports for review
- support review comments, approval, rejection, and final issue

Key outcomes:

- real report production loop inside the platform
- structured handoff from valuer to reviewer

## Module I — Review, QA And Compliance

What it does:

- enforce report readiness before approval/issue
- enforce review comment resolution permissions
- log review and issue events in audit history
- support audit filtering by entity and user

Key outcomes:

- clearer governance around valuation output
- better traceability for internal review

## Module J — Billing And Finance

What it does:

- create invoices from eligible cases
- edit draft commercial terms
- issue invoices
- mark invoices as paid
- void eligible invoices
- auto-align case stage with finance lifecycle

Key outcomes:

- one invoice per case
- finance-specific workflow instead of ad hoc billing outside the system

## Module K — Dashboard And Analytics

What it does:

- show role-aware operational summary metrics
- show case stage and overdue views
- surface finance-first metrics for accounts users
- track comparables, turnaround, revenue, and pipeline signals

Key outcomes:

- different users see the metrics that matter to their role
- finance gets a bolder receivables/income snapshot

## Module L — Document Management

What it does:

- upload files into the document vault with signed storage
- link each document to at least one case, client, or property
- list, filter, update metadata, soft delete, and download documents
- support case-level mobile document upload/open/remove

Key outcomes:

- the platform can now carry supporting files alongside operational records

## 7. Mobile Platform Strategy In Practice

The mobile app is not a second copy of the web app.

It is intentionally focused on what needs to happen away from the desk:

- open assigned work quickly
- continue inspection drafts safely
- upload photos and supporting documents
- attach comparables when working from case context
- receive notifications and jump to the right case

### Mobile reliability already implemented

- local inspection draft persistence
- queued draft retry sync
- queued photo upload retry sync
- queued submit retry sync
- inspection date picker
- per-inspection sync status cues

## 8. Notifications And Deep Links

Workflow events now generate in-app notifications and best-effort Expo push alerts.

Implemented triggers include:

- case assignment and reassignment
- report submitted for review
- report approved
- report rejected
- review comment added
- invoice issued
- payment received
- overdue case detection
- overdue invoice detection

On mobile, notifications can deep-link directly into the case workspace.

## 9. Cross-Module Workflow Chains

### Workflow 1 — Intake To Case

1. Create or find the client in CRM
2. Create or find the property
3. Open the case with branch, assignees, due date, and fee
4. The case becomes the master record for the instruction

### Workflow 2 — Case To Inspection

1. Case moves to inspection scheduling
2. Inspection is created for the case
3. Field user opens it on mobile
4. Draft data and photos are captured
5. Inspection is submitted
6. Case advances into the next workflow stage

### Workflow 3 — Evidence To Analysis

1. Comparables are attached from the firm library
2. Relevance, adjustment, and weighting are applied per case
3. The valuer records assumptions, basis, and concluded value
4. Reconciliation commentary explains the final conclusion

### Workflow 4 — Report To Review

1. Report draft is generated from the case
2. Reviewer adds comments or blocks
3. Comments are resolved by the right person
4. Report is approved
5. Final issue action completes the reporting phase

### Workflow 5 — Invoice To Cash Visibility

1. Finance creates the invoice from the eligible case
2. Invoice is issued
3. Dashboard reflects pending receivables
4. Payment is received and recorded
5. Dashboard and case stage update automatically

## 10. Demo Data And QA Support

The repository includes a repeatable demo seed used to exercise the implemented flows.

It creates:

- a demo firm and branches
- users across operational roles
- clients, properties, cases, comparables, analyses, reports, invoices, notifications, and audit logs

This is intended to support:

- demos
- module walkthroughs
- QA and bug-bash sessions
- onboarding and implementation review

## 11. Current Web UX Pattern

The product now follows a more consistent operating shell:

- calmer neutral UI surfaces
- Nigerian-green accents
- collapsible desktop sidebar
- right-side full-width mobile nav sheet
- modal create/edit flows for major records
- mobile filter pop-out pattern across list pages
- stacked card layouts on narrow screens instead of squeezed tables

## 12. Current Boundaries And Honest Gaps

The platform is broad and operational today, but a few boundaries remain:

- browser print/save-to-PDF is the current PDF path, not server-rendered PDFs
- Expo Go still has notification limitations compared with a full dev build
- push delivery and real-device notification QA should still be tested in production-like conditions
- deeper automated regression coverage is still lighter than the manual module coverage
- a broader formal SOP pack for each department is still worth creating later

## 13. Where To Look Next

Use these documents together:

- [README.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/README.md)
  for setup, local commands, and current platform notes
- [project-docs.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/project-docs.md)
  for the original target specification
- [tests/module-a.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-a.md) through [tests/module-l.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-l.md)
  for module-level verification references
- [tests/platform-hardening.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/platform-hardening.md)
  for notification, overdue-sync, and rate-limit checks

## 14. Summary

Valuation OS is no longer just a set of disconnected modules.

It now behaves like a joined operating platform for valuation firms:

- CRM feeds case intake
- case execution feeds inspection and evidence
- evidence feeds analysis
- analysis feeds reporting
- reporting feeds billing
- billing feeds dashboards
- notifications and audit tie the operating flow together across web and mobile
