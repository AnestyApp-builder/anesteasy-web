'use client'

import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProtectedRoute>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="relative">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminProtectedRoute>
  )
}
