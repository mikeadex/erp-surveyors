export type NotificationType =
  | 'case_assigned'
  | 'inspection_due'
  | 'review_requested'
  | 'report_approved'
  | 'report_rejected'
  | 'invoice_sent'
  | 'payment_received'
  | 'case_overdue'
  | 'comment_added'

export interface Notification {
  id: string
  firmId: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  entityType: string
  entityId: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}
