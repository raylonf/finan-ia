'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

const PUBLIC_ROUTES = ['/login', '/cadastro']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex h-[100dvh]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
