'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, CheckCircle2, Loader2, MessageSquarePlus, Send, ShieldAlert, XCircle } from 'lucide-react'
import type { UserRole } from '@valuation-os/types'

type ReviewCommentItem = {
  id: string
  type: 'blocking' | 'suggestion' | 'informational'
  body: string
  isResolved: boolean
  createdLabel: string
  authorName: string
  resolvedLabel: string | null
  resolvedByName: string | null
}

const COMMENT_TYPE_STYLES = {
  blocking: 'bg-rose-50 text-rose-700 border-rose-200',
  suggestion: 'bg-amber-50 text-amber-700 border-amber-200',
  informational: 'bg-slate-100 text-slate-700 border-slate-200',
} as const

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60'

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60'

export function ReportReviewPanel({
  caseId,
  reportId,
  status,
  currentRole,
  canResolveComments,
  comments,
}: {
  caseId: string
  reportId: string
  status: 'draft' | 'submitted_for_review' | 'approved' | 'rejected' | 'final'
  currentRole: UserRole
  canResolveComments: boolean
  comments: ReviewCommentItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [commentType, setCommentType] = useState<'blocking' | 'suggestion' | 'informational'>(
    'suggestion',
  )
  const [commentBody, setCommentBody] = useState('')

  const blockingOpen = useMemo(
    () => comments.filter((comment) => comment.type === 'blocking' && !comment.isResolved).length,
    [comments],
  )

  const canSubmit = currentRole === 'managing_partner' || currentRole === 'valuer'
  const canReview = currentRole === 'managing_partner' || currentRole === 'reviewer'
  const canResolve = canResolveComments

  function consumeActionError(json: any, fallback: string) {
    const details = json?.error?.details
      ? Object.values(json.error.details)
          .flatMap((value) => (Array.isArray(value) ? value : []))
          .filter((value): value is string => typeof value === 'string')
      : []

    setErrorMsg(json?.error?.message ?? fallback)
    setErrorDetails(details)
  }

  async function runAction(endpoint: string) {
    setErrorMsg(null)
    setErrorDetails([])
    const res = await fetch(endpoint, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      consumeActionError(json, 'Action failed')
      return
    }
    startTransition(() => router.refresh())
  }

  async function submitComment() {
    if (!commentBody.trim()) return
    setErrorMsg(null)
    setErrorDetails([])

    const res = await fetch(`/api/v1/cases/${caseId}/reports/${reportId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: commentType,
        body: commentBody.trim(),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      consumeActionError(json, 'Failed to add review comment')
      return
    }

    setCommentBody('')
    setCommentType('suggestion')
    startTransition(() => router.refresh())
  }

  async function resolveComment(commentId: string) {
    setErrorMsg(null)
    setErrorDetails([])
    const res = await fetch(`/api/v1/cases/${caseId}/reports/${reportId}/comments/${commentId}`, {
      method: 'PATCH',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      consumeActionError(json, 'Failed to resolve comment')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Review Workflow
          </p>
          <h2 className="text-lg font-semibold text-slate-950">Move this draft through review</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Reviewers can raise comments and control approval. Valuers can respond to feedback and
            submit clean drafts back into the workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === 'draft' && canSubmit ? (
            <button
              type="button"
              onClick={() => runAction(`/api/v1/cases/${caseId}/reports/${reportId}/submit`)}
              disabled={isPending}
              className={primaryButtonClassName}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit For Review
            </button>
          ) : null}

          {status === 'submitted_for_review' && canReview ? (
            <>
              <button
                type="button"
                onClick={() => runAction(`/api/v1/cases/${caseId}/reports/${reportId}/approve`)}
                disabled={isPending || blockingOpen > 0}
                className={primaryButtonClassName}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </button>
              <button
                type="button"
                onClick={() => runAction(`/api/v1/cases/${caseId}/reports/${reportId}/reject`)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </button>
            </>
          ) : null}

          {status === 'approved' && canReview ? (
            <button
              type="button"
              onClick={() => runAction(`/api/v1/cases/${caseId}/reports/${reportId}/issue`)}
              disabled={isPending || blockingOpen > 0}
              className={primaryButtonClassName}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Issue Final
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Open Blocking
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{blockingOpen}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Total Comments
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{comments.length}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Workflow Note
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Drafts should move to review only after analysis and inspection are stable.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{errorMsg}</p>
          {errorDetails.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-rose-700/90">
              {errorDetails.map((detail) => (
                <li key={detail}>• {detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Add Review Comment</h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <select
              value={commentType}
              onChange={(event) =>
                setCommentType(event.target.value as 'blocking' | 'suggestion' | 'informational')
              }
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="suggestion">Suggestion</option>
              <option value="blocking">Blocking</option>
              <option value="informational">Informational</option>
            </select>

            <div className="space-y-3">
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={4}
                placeholder="Add reviewer guidance, blocking issues, or helpful notes for the valuer."
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={isPending || commentBody.trim().length === 0}
                  className={secondaryButtonClassName}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400">
            No review comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${COMMENT_TYPE_STYLES[comment.type]}`}>
                      {comment.type}
                    </span>
                    {comment.isResolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        <CheckCheck className="h-3.5 w-3.5" />
                        Resolved
                      </span>
                    ) : comment.type === 'blocking' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Action Needed
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{comment.body}</p>
                  <p className="text-xs text-slate-400">
                    {comment.authorName} · {comment.createdLabel}
                    {comment.isResolved && comment.resolvedByName ? (
                      <span>
                        {' '}
                        · Resolved by {comment.resolvedByName}
                        {comment.resolvedLabel ? ` on ${comment.resolvedLabel}` : ''}
                      </span>
                    ) : null}
                  </p>
                </div>

                {!comment.isResolved && canResolve ? (
                  <button
                    type="button"
                    onClick={() => resolveComment(comment.id)}
                    disabled={isPending}
                    className={secondaryButtonClassName}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                    Resolve
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
