# ValuCore Africa — Internal Product Gap Audit

This document is an internal reality check against recent review feedback.

It answers one question directly:

**What is truly missing, what is implemented but not yet proven, and what is already working but was underestimated in the review?**

Evidence sources used for this audit:

- current-state product guide in [/Users/michaeladeleye/Documents/product/ERP Surveyors/docs/current-functionality-bible.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/docs/current-functionality-bible.md)
- manual verification references in [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests)
- direct code inspection of current web/mobile/API surfaces in `apps/web`, `apps/mobile`, and shared packages

## Classification

- `Proven`
  Implemented and already evidenced by explicit workflow/test coverage in the repo.
- `Implemented but unproven`
  Code exists, but current demo evidence or walkthrough proof is still weak.
- `Partially surfaced`
  Functionality exists, but it is hidden, shallow, secondary, or not prominent enough in the product.
- `Missing`
  Not implemented, clearly placeholder, or not evidenced in code.

## Executive Verdict

The review is directionally right about one thing: **the biggest remaining risk is proof, not architecture**.

However, it understates how much functional depth is already in the repository. The product is no longer just a role-based shell. Core operating flows for cases, inspections, comparables, reports, invoices, documents, notifications, and audit have both implementation coverage and manual verification references.

The strongest current state is:

- case, inspection, comparable, report, invoice, document, notification, and audit workflows all exist in working form
- role-aware dashboards and branch-aware visibility are implemented
- report templates, review flow, finance lifecycle, overdue sync, and notification routing are implemented
- there is seeded demo data specifically designed to exercise end-to-end slices

The weakest current state is:

- global search looks like a surfaced affordance without proven retrieval behavior
- some real functionality is buried in secondary settings areas rather than being obviously discoverable
- a number of flows are documented for manual verification but still need live walkthrough proof in the current demo/staging environment

Bottom line:

- **Frontend shell quality:** strong
- **Core workflow implementation:** strong to moderate
- **Workflow proof in live demo/staging:** still incomplete
- **Discoverability/admin surfacing:** uneven

## Starting Facts Locked In

These are facts from the current repo state, not assumptions:

- workflow verification guides already exist for cases, comparables, reports, review/compliance, invoices, dashboards, documents, and platform hardening
- report template management is implemented and surfaced in the reports area via [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/reports/report-template-manager.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/reports/report-template-manager.tsx)
- branch management exists in settings, and branch filtering exists in dashboards
- notifications and overdue sync are implemented and documented with checks
- audit filtering by entity and user is implemented
- global search currently appears to be a header affordance only, with no confirmed retrieval flow in the inspected code
- branch functionality should be treated as `Partially surfaced`, not `Missing`

## 1. End-To-End Workflow Proof

| Workflow Area | Rating | Repo Evidence | Internal Verdict |
| --- | --- | --- | --- |
| Create and assign case | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-d.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-d.md) covers create, assign reviewer, notes, checklist, activity, overdue, and filtering. | The case master workflow is implemented and test-guided. |
| Complete and submit inspection | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-e.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-e.md) covers schedule, update, submit, and post-submit edit blocking. | Inspection execution is more than present; it has lifecycle rules. |
| Add/import comparables and attach to case | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-f.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-f.md) covers create, search, attach, detach, update, and CSV import. | Evidence engine is implemented beyond marketing language. |
| Build analysis from evidence | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-g.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-g.md) covers analysis create, update, concluded value, and completion rules. | The valuation workbench is implemented as structured workflow, not just UI. |
| Generate, review, approve, reject, and issue report | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-h.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-h.md) and [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-i.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-i.md). | Report lifecycle is materially implemented, including review comments and gating. |
| Create, issue, void, and mark invoice paid | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-j.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-j.md). | Finance lifecycle is deeper than “dashboard only.” |
| Audit the activity trail | `Proven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-i.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-i.md), audit page code in [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/audit/page.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/app/(dashboard)/audit/page.tsx). | Traceability exists, with entity and user filtering. |
| Confirm notifications and overdue sync | `Implemented but unproven` | [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/platform-hardening.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/platform-hardening.md), notification code in [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/notifications/workflow.ts](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/lib/notifications/workflow.ts). | Implemented and documented, but still needs stronger live proof in staging/real-device conditions. |
| Test permissions by role | `Implemented but unproven` | Role scope exists throughout modules and tests, but not yet collected into one role matrix walkthrough. | This is a verification gap more than a build gap. |

### End-to-end conclusion

The review claim that end-to-end workflows are “not yet evidenced” is partly fair for live demo proof, but it is not fair as a statement about implementation depth. The repo already contains explicit operational workflow coverage across the main chain:

`case -> inspection -> comparables -> analysis -> report -> review -> invoice`

## 2. Core Modules Called Out In The Review

| Area | Rating | Reality Check |
| --- | --- | --- |
| Branch operations | `Partially surfaced` | Branch creation and editing exist in settings via [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/settings/branch-section.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/settings/branch-section.tsx) and [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/settings/branch-modal.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/settings/branch-modal.tsx). Dashboard branch filters are referenced in [/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-k.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/module-k.md). The reviewer is right that this is not strongly surfaced as its own operational domain. |
| Comparables / evidence engine | `Proven` | Manual create, search, attach, detach, import, and case-specific weighting/adjustment are covered. This is one of the stronger modules in the current repo. |
| Report lifecycle and templates | `Proven` | Draft generation, comments, submit, reject, approve, issue, HTML/PDF download, and firm template management are all present. The review underestimated this area. |
| Finance workflow | `Proven` | Invoice creation, uniqueness guard, editing, issue, mark-paid, void, audit writes, and dashboard finance summaries exist. Month-end reconciliation depth is still absent, but the core finance workflow is real. |
| Notifications / task orchestration | `Implemented but unproven` | In-app notifications, read/read-all, push token support, overdue sync, and mobile deep-link handling exist. Real delivery proof still needs stronger staged validation. |
| Audit / compliance | `Proven` | Audit page, filters, report compliance gating, and action-level logging are all present. What is missing is deeper old/new diffing, not basic audit capability. |
| Settings / admin depth | `Implemented but unproven` | Firm settings, branch settings, system readiness, and report template control are present. The review is fair that broader admin scope is not yet obviously demonstrated in a single walkthrough. |
| Search | `Missing` | The header exposes a polished search affordance in [/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/layout/header.tsx](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/components/layout/header.tsx), but current inspection did not confirm a backing search route, modal, or retrieval workflow. This looks like the clearest real gap. |

## 3. Review Claim Vs Repo Reality

### 1. “Actual end-to-end workflows are not yet proven”

**Verdict:** Mostly `Implemented but unproven`, not `Missing`.

The repo already includes operational workflow verification guides for the full middle of the chain. The fair criticism is not that the workflows do not exist. The fair criticism is that live demo proof still needs a tighter walkthrough in staging.

### 2. “Branch operations are mentioned, but not clearly surfaced”

**Verdict:** `Partially surfaced`.

This is a good call-out. Branch functionality exists in settings and dashboard filtering, but it is not presented as a first-class management surface with its own performance/workload area.

### 3. “Evidence engine depth is not yet confirmed”

**Verdict:** `Proven`.

The repo supports:

- manual comparable creation
- search and filtering
- CSV import jobs
- attaching evidence to a case
- case-specific weighting/relevance/adjustment
- mobile attach/quick-add from case context

This is implemented depth, not just concept presence.

### 4. “Report generation lifecycle is not fully proven”

**Verdict:** `Proven`.

The lifecycle is implemented:

- create report draft
- add comments
- resolve comments
- submit for review
- approve or reject
- issue final report
- manage report templates
- download HTML and PDF output

The only fair caution is that branded output quality should still be validated against real firm expectations.

### 5. “Finance workflow may still be shallow”

**Verdict:** `Proven`, with some advanced finance depth still `Missing`.

What exists:

- invoice create/edit/issue/paid/void
- one-invoice-per-case enforcement
- audit coverage
- finance dashboard metrics
- overdue support

What is still missing:

- deeper reconciliation/month-end tooling
- richer branch/client finance reporting beyond the current dashboard and invoice workflow

### 6. “Notifications and task orchestration are light”

**Verdict:** `Implemented but unproven`.

The codebase has more than a notification icon:

- notification records
- read/read-all flows
- workflow-triggered creation
- overdue notification job
- mobile routing from notifications

The real gap is delivery proof, especially on mobile and in production-like conditions.

### 7. “Search is present, but not proven useful”

**Verdict:** `Missing`.

This is the cleanest valid criticism. Search appears visually surfaced but not functionally evidenced.

### 8. “Audit and compliance depth is unclear”

**Verdict:** `Proven`.

This area is already materially implemented. What remains missing is advanced diff-style audit richness, not basic compliance support.

### 9. “Settings/admin depth is unknown”

**Verdict:** `Implemented but unproven`.

Settings has real depth already, but it has not been walked through convincingly enough in demo storytelling.

### 10. “Missing obvious operational modules”

**Verdict:** Mixed.

Likely still missing or not yet strong:

- true global search
- assignment board / workload planner
- calendar/scheduling beyond case/inspection dates
- bulk actions
- exportable operational reporting beyond current views
- deeper in-case collaboration/comments as a first-class feature

Already present in some form:

- onboarding/help layer in docs
- dashboard analytics by role
- file/document center

## 4. Cross-Cutting Verdict

### Stronger than the review suggests

- comparable/evidence workflow depth
- report lifecycle depth
- finance lifecycle depth
- audit/compliance depth
- document management breadth across web and mobile

### Genuinely weak today

- global search
- unified live proof of permissions by role
- first-class surfacing of branch operations
- production-like proof for notifications and mobile-delivery behavior

### Mostly a discoverability problem, not a backend gap

- branch management
- report template control
- admin/settings depth
- some finance capabilities
- some audit capabilities

## 5. Top 10 Gaps

| Priority | Gap | Rating | Why It Matters |
| --- | --- | --- | --- |
| 1 | Working global search across records | `Missing` | Search is surfaced prominently and currently appears unresolved. |
| 2 | Full live QA script proving the end-to-end operating chain | `Implemented but unproven` | The product needs proof, not just implementation. |
| 3 | Role-by-role permission test matrix | `Implemented but unproven` | Important for trust, branch safety, and pilot rollout. |
| 4 | Real-device notification delivery proof | `Implemented but unproven` | Mobile workflow credibility depends on this. |
| 5 | Branch operations surfaced beyond settings | `Partially surfaced` | Branch capability exists but is not obvious in product storytelling. |
| 6 | Broader admin/settings walkthrough and controls inventory | `Implemented but unproven` | Current depth is easy to miss. |
| 7 | Advanced finance reporting / reconciliation layer | `Missing` | Core invoicing exists, but finance maturity is not complete. |
| 8 | Advanced audit diffing | `Missing` | Helpful for compliance-sensitive customers. |
| 9 | Workload planning / assignment board | `Missing` | Operational teams may expect this next. |
| 10 | Bulk operational actions | `Missing` | Useful for scale and admin efficiency. |

## 6. Remediation Matrix

| Bucket | Item | Suggested Owner | Severity | Effort |
| --- | --- | --- | --- | --- |
| Critical before customer rollout | Build real global search or remove the affordance until it works | Product + web | High | Medium |
| Critical before customer rollout | Run and document one full live QA walkthrough from case intake to payment | Product + QA | High | Small |
| Critical before customer rollout | Run role-permission validation across managing partner, valuer, reviewer, finance, branch user | QA + backend | High | Small |
| Important for pilot confidence | Validate notification delivery and mobile deep links on real devices | Mobile + QA | Medium | Medium |
| Important for pilot confidence | Create a clearer demo/playbook showing branch behavior, report templates, audit, and settings | Product | Medium | Small |
| Important for pilot confidence | Add a branch operations summary area or branch performance page | Product + web | Medium | Medium |
| Polish / discoverability | Surface report templates more clearly from report workflow and settings | Web | Low | Small |
| Polish / discoverability | Surface audit/compliance value more explicitly in report and review flows | Web | Low | Small |
| Polish / discoverability | Tighten finance proof with a guided invoice lifecycle walkthrough | Finance ops + QA | Low | Small |
| Longer-term depth | Add reconciliation/month-end finance tooling | Product + finance | Medium | Medium to large |
| Longer-term depth | Add advanced audit diffs | Backend | Medium | Medium |
| Longer-term depth | Add workload planner / assignment board | Product + web | Medium | Medium to large |

## 7. Recommended Next Live QA Pass

The next validation pass should focus on proving the product, not polishing more UI.

Recommended order:

1. sign in as `admin` or `managing_partner`
2. create a client, property, and case
3. assign valuer and reviewer
4. complete inspection
5. attach/import comparables
6. complete analysis
7. generate report
8. add review comment, resolve it, approve, reject one, then issue
9. create invoice, issue it, and mark it paid
10. inspect audit history for the case/report/invoice chain
11. confirm notification creation and routing
12. repeat selected checks as branch-scoped and non-managing roles

## Final Assessment

This product is **past the “mostly shell” stage**.

The most accurate internal description today is:

- **core operating system:** largely implemented
- **proof in live staging/demo:** still incomplete
- **discoverability of some deeper capabilities:** uneven
- **most obvious true product gap:** search

If the goal is founder confidence or pilot readiness, the next step is not another design pass. It is a proof pass:

- prove the workflow chain live
- prove permissions by role
- fix or hide search until it is real
- surface branch/admin depth more clearly
