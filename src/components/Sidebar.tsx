'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  PieChart,
  Settings,
  Bot,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCachedTransactions, getTransactions } from '@/lib/data'
import { getTotalIncome, getTotalExpenses } from '@/lib/utils'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface NavItem {
  href: string
  label: string
  icon: any
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Inteligência',
    items: [
      { href: '/chat', label: 'Chat IA', icon: MessageSquare },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/despesas', label: 'Despesas', icon: ArrowDownCircle },
      { href: '/receitas', label: 'Receitas', icon: ArrowUpCircle },
      { href: '/analise', label: 'Análise', icon: PieChart },
      { href: '/graficos', label: 'Gráficos', icon: BarChart3 },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [balanceRatio, setBalanceRatio] = useState(0.5) // 0 = negativo, 0.5 = neutro, 1 = positivo

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.name || '')
        setUserEmail(user.email || '')
      }
    })

    // Calcular saldo para cor da sidebar
    const cached = getCachedTransactions()
    if (cached.length > 0) updateBalanceRatio(cached)
    getTransactions().then((transactions) => {
      if (transactions.length > 0) updateBalanceRatio(transactions)
    })
  }, [])

  function updateBalanceRatio(transactions: { type: string; amount: number }[]) {
    const income = getTotalIncome(transactions as any)
    const expenses = getTotalExpenses(transactions as any)
    if (income === 0 && expenses === 0) {
      setBalanceRatio(0.5)
      return
    }
    // Ratio: 1 = muito positivo, 0 = muito negativo
    const balance = income - expenses
    const ratio = income > 0 ? Math.max(0, Math.min(1, (balance / income) + 0.3)) : (balance >= 0 ? 0.5 : 0)
    setBalanceRatio(ratio)
  }

  // Atualizar cor quando transações mudam em tempo real
  const refreshBalance = useCallback(() => {
    getTransactions().then((t) => { if (t.length > 0) updateBalanceRatio(t) })
  }, [])
  useRealtimeSync('transactions', refreshBalance)

  // Gerar cor de degradê baseado no saldo
  function getSidebarGradient(): string {
    if (balanceRatio >= 0.6) {
      // Positivo → verde suave
      return 'from-emerald-50/80 via-white to-emerald-50/40'
    } else if (balanceRatio >= 0.3) {
      // Neutro → branco normal
      return 'from-white via-white to-gray-50'
    } else {
      // Negativo → vermelho suave
      return 'from-red-50/60 via-white to-red-50/30'
    }
  }

  function getSidebarBorderColor(): string {
    if (balanceRatio >= 0.6) return 'border-emerald-100'
    if (balanceRatio >= 0.3) return 'border-gray-100'
    return 'border-red-100'
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Botão mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-100"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-gradient-to-b ${getSidebarGradient()} border-r ${getSidebarBorderColor()} flex flex-col
          transition-all duration-700 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Finan IA</h1>
              <p className="text-[10px] text-gray-400">Consultor Lucrécio</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-gray-600"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (pathname === '/' && item.href === '/chat')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`nav-item group ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-brand-700' : 'text-gray-600 group-hover:text-gray-800'}`}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Usuário */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-700">
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{userName || 'Usuário'}</p>
              <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-xs text-gray-400 hover:text-red-500 transition-colors text-left"
          >
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}
