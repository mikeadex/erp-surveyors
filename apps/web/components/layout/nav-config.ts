import type { UserRole } from '@valuation-os/types'

export interface NavItem {
  label: string
  href: string
  icon: string
  allowedRoles?: UserRole[]
  children?: Omit<NavItem, 'children'>[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Cases',
    href: '/cases',
    icon: 'FolderOpen',
  },
  {
    label: 'Inspections',
    href: '/inspections',
    icon: 'ClipboardList',
    allowedRoles: ['managing_partner', 'reviewer', 'valuer', 'field_officer'],
  },
  {
    label: 'Comparables',
    href: '/comparables',
    icon: 'BarChart3',
    allowedRoles: ['managing_partner', 'reviewer', 'valuer'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'FileText',
    allowedRoles: ['managing_partner', 'reviewer', 'valuer'],
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: 'Users',
  },
  {
    label: 'Properties',
    href: '/properties',
    icon: 'Building2',
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: 'Receipt',
    allowedRoles: ['managing_partner', 'admin', 'finance'],
  },
  {
    label: 'Team',
    href: '/team',
    icon: 'Users',
    allowedRoles: ['managing_partner', 'admin'],
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: 'Paperclip',
  },
  {
    label: 'Audit Log',
    href: '/audit',
    icon: 'Shield',
    allowedRoles: ['managing_partner'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    allowedRoles: ['managing_partner', 'admin'],
  },
]
