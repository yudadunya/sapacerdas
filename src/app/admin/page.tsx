import AdminDashboard from '@/components/AdminDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — SapaCerdas',
  robots: 'noindex'
}

export default function AdminPage() {
  return <AdminDashboard />
}
