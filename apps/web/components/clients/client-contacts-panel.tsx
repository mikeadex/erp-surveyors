'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'

interface ContactRecord {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
}

interface ContactFormState {
  name: string
  role: string
  email: string
  phone: string
  isPrimary: boolean
}

interface ClientContactsPanelProps {
  clientId: string
  contacts: ContactRecord[]
  isArchived: boolean
}

function blankContact(primary = false): ContactFormState {
  return {
    name: '',
    role: '',
    email: '',
    phone: '',
    isPrimary: primary,
  }
}

export function ClientContactsPanel({
  clientId,
  contacts,
  isArchived,
}: ClientContactsPanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(blankContact(contacts.length === 0))
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId) ?? null,
    [contacts, selectedId],
  )

  function closeModal() {
    setMode(null)
    setSelectedId(null)
    setForm(blankContact(contacts.length === 0))
    setError(null)
  }

  function openCreate() {
    setMode('create')
    setSelectedId(null)
    setForm(blankContact(contacts.length === 0))
    setError(null)
  }

  function openEdit(contact: ContactRecord) {
    setMode('edit')
    setSelectedId(contact.id)
    setForm({
      name: contact.name,
      role: contact.role ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      isPrimary: contact.isPrimary,
    })
    setError(null)
  }

  function openDelete(contact: ContactRecord) {
    setMode('delete')
    setSelectedId(contact.id)
    setError(null)
  }

  async function createContact() {
    setLoadingAction('create')
    setError(null)
    const res = await fetch(`/api/v1/clients/${clientId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        role: form.role || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        isPrimary: form.isPrimary,
      }),
    })
    setLoadingAction(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to add contact')
      return
    }
    closeModal()
    router.refresh()
  }

  async function saveContact() {
    if (!selectedId) return

    setLoadingAction(`save-${selectedId}`)
    setError(null)
    const res = await fetch(`/api/v1/clients/${clientId}/contacts/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        role: form.role || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        isPrimary: form.isPrimary,
      }),
    })
    setLoadingAction(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to update contact')
      return
    }
    closeModal()
    router.refresh()
  }

  async function deleteContact() {
    if (!selectedId) return

    setLoadingAction(`delete-${selectedId}`)
    setError(null)
    const res = await fetch(`/api/v1/clients/${clientId}/contacts/${selectedId}`, {
      method: 'DELETE',
    })
    setLoadingAction(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to remove contact')
      return
    }
    closeModal()
    router.refresh()
  }

  async function promoteContact(contactId: string) {
    setLoadingAction(`promote-${contactId}`)
    setError(null)
    const res = await fetch(`/api/v1/clients/${clientId}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    setLoadingAction(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to set primary contact')
      return
    }
    router.refresh()
  }

  return (
    <>
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="max-w-xs">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Contacts</h2>
            <p className="mt-1 text-sm leading-7 text-gray-500">
              Manage client contacts in popup dialogs instead of inline blocks.
            </p>
          </div>
          {!isArchived && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Contact
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="space-y-3">
          {contacts.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No contacts yet.
            </p>
          ) : (
            contacts.map((contact) => {
              const busy = loadingAction?.includes(contact.id)

              return (
                <div key={contact.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[2rem] font-semibold leading-[1.05] tracking-tight text-gray-900">
                          {contact.name}
                        </p>
                        {contact.isPrimary && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                            Primary
                          </span>
                        )}
                      </div>
                      {contact.role && <p className="text-sm font-medium text-gray-500">{contact.role}</p>}
                      <div className="space-y-1.5 text-base text-gray-700">
                        {contact.email && <p className="break-words leading-7">{contact.email}</p>}
                        {contact.phone && <p>{contact.phone}</p>}
                      </div>
                    </div>
                    {!isArchived && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                        {!contact.isPrimary && (
                          <button
                            type="button"
                            onClick={() => promoteContact(contact.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                          >
                            {busy && loadingAction === `promote-${contact.id}`
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Star className="h-3.5 w-3.5" />}
                            Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(contact)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(contact)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {mode === 'create' && (
        <ModalShell
          title="Add Contact"
          description="Create a new contact for this client."
          onClose={closeModal}
          widthClassName="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
              />
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                placeholder="Role"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              Primary contact
            </label>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createContact}
                disabled={loadingAction === 'create'}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingAction === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Contact
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {mode === 'edit' && selectedContact && (
        <ModalShell
          title="Edit Contact"
          description="Update the selected client contact."
          onClose={closeModal}
          widthClassName="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
              />
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                placeholder="Role"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              Primary contact
            </label>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveContact}
                disabled={loadingAction === `save-${selectedId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingAction === `save-${selectedId}` && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {mode === 'delete' && selectedContact && (
        <ModalShell
          title="Remove Contact"
          description={`Remove ${selectedContact.name} from this client?`}
          onClose={closeModal}
          widthClassName="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This removes the contact record from the client. If this is the current primary
              contact, another remaining contact will be promoted automatically.
            </p>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteContact}
                disabled={loadingAction === `delete-${selectedId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loadingAction === `delete-${selectedId}` && <Loader2 className="h-4 w-4 animate-spin" />}
                Remove Contact
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
