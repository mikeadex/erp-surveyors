# Operations SOP

This SOP is for managing partners, admins, and operations staff who coordinate intake, case setup, team management, and branch execution.

## Primary Objective

Keep work moving from enquiry to execution without data gaps, ownership confusion, or missed deadlines.

## Main Areas You Own

- firm and branch setup
- team invites, role updates, and branch assignment
- client and property readiness for new instructions
- case creation and assignment
- overdue monitoring and operational follow-up
- document linkage and admin support

## Daily Workflow

1. Review the dashboard for pipeline load, overdue pressure, and pending review work.
2. Check notifications for assignments, overdue cases, report review movement, and finance signals.
3. Confirm new clients and properties are captured cleanly before creating new cases.
4. Create cases with the correct branch, valuer, reviewer, due date, and fee context.
5. Watch for stuck stages:
   - `inspection_scheduled`
   - `review`
   - `invoice_sent`
6. Escalate overdue or blocked items to the right owner.

## Intake Checklist

Before opening a case, confirm:

- the client record exists and belongs to the right branch
- contacts are complete and a sensible primary contact exists
- the property record is correct and not a duplicate
- the instruction has a valuation type and purpose
- the valuer and reviewer are appropriate for the branch and workload
- the due date is realistic

## Assignment Rules

- every case should have a clear owning valuer
- review-stage cases should also have an assigned reviewer
- branch-scoped users should not be assigned outside their branch unless policy allows it
- reassignment should happen through the case record so notifications and audit history stay accurate

## Documents

Use the document vault when:

- an instruction letter arrives
- legal title or supporting records need to be linked
- a working file must remain discoverable across the case, client, or property

Always make sure each uploaded document is linked to at least one real record.

## What To Watch Closely

- cases becoming overdue
- inspections not moving from draft to submitted
- reports sitting too long in review
- invoices that remain sent or overdue
- unassigned or legacy records with missing branch ownership

## Handoffs

- to valuers:
  cases that are properly opened, assigned, and ready for evidence work
- to reviewers:
  reports in `submitted_for_review` with complete supporting analysis
- to finance:
  cases that have reached invoice eligibility or payment follow-up

## Escalation Triggers

Escalate immediately when:

- a due date has passed and the case is still active
- inspection evidence is incomplete but the case is being pushed forward
- the wrong branch or wrong staff member owns a live case
- a report is blocked by unresolved review comments
- an invoice is overdue without follow-up
