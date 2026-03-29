export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void'

export interface Invoice {
  id: string
  caseId: string
  firmId: string
  clientId: string
  invoiceNumber: string
  status: InvoiceStatus
  amount: string
  currency: string
  taxRate: string | null
  taxAmount: string | null
  totalAmount: string
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceSummary {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  amount: string
  totalAmount: string
  dueDate: string | null
  caseId: string
}
