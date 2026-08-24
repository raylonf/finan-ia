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

    // Polling a cada 10s para manter a cor atualizada
    const interval = setInterval(() => {
      getTransactions().then((t) => { if (t.length > 0) updateBalanceRatio(t) })
    }, 10000)

    // Escutar evento customizado quando transações mudam localmente
    function handleTransactionChange() {
      getTransactions().then((t) => { if (t.length > 0) updateBalanceRatio(t) })
    }
    window.addEventListener('transaction-changed', handleTransactionChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('transaction-changed', handleTransactionChange)
    }
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
  function getSidebarStyle(): React.CSSProperties {
    if (balanceRatio >= 0.6) {
      // Positivo → verde escuro elegante
      return { background: 'linear-gradient(180deg, #064e3b 0%, #065f46 50%, #047857 100%)' }
    } else if (balanceRatio >= 0.3) {
      // Neutro → tom escuro neutro
      return { background: 'linear-gradient(180deg, #1f2937 0%, #374151 50%, #4b5563 100%)' }
    } else {
      // Negativo → vermelho escuro
      return { background: 'linear-gradient(180deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)' }
    }
  }

  function getSidebarBorderColor(): string {
    if (balanceRatio >= 0.6) return 'border-emerald-900'
    if (balanceRatio >= 0.3) return 'border-gray-700'
    return 'border-red-900'
  }

  // Cores dos textos/botões que combinam com o fundo
  function getTextColor(): string {
    return 'text-white'
  }

  function getSubtextColor(): string {
    if (balanceRatio >= 0.6) return 'text-emerald-200'
    if (balanceRatio >= 0.3) return 'text-gray-300'
    return 'text-red-200'
  }

  function getActiveItemStyle(): string {
    if (balanceRatio >= 0.6) return 'bg-emerald-800/50 text-white'
    if (balanceRatio >= 0.3) return 'bg-gray-600/50 text-white'
    return 'bg-red-800/50 text-white'
  }

  function getInactiveItemStyle(): string {
    if (balanceRatio >= 0.6) return 'text-emerald-100 hover:bg-emerald-800/30 hover:text-white'
    if (balanceRatio >= 0.3) return 'text-gray-300 hover:bg-gray-600/30 hover:text-white'
    return 'text-red-100 hover:bg-red-800/30 hover:text-white'
  }

  function getIconActiveStyle(): string {
    if (balanceRatio >= 0.6) return 'bg-emerald-400 shadow-emerald-400/30'
    if (balanceRatio >= 0.3) return 'bg-gray-400 shadow-gray-400/30'
    return 'bg-red-400 shadow-red-400/30'
  }

  function getIconInactiveStyle(): string {
    if (balanceRatio >= 0.6) return 'bg-emerald-800/60'
    if (balanceRatio >= 0.3) return 'bg-gray-600/60'
    return 'bg-red-800/60'
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
        style={getSidebarStyle()}
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 border-r ${getSidebarBorderColor()} flex flex-col
          transition-all duration-1000 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-lg leading-tight ${getTextColor()}`}>Finan IA</h1>
              <p className={`text-[10px] ${getSubtextColor()}`}>Consultor Lucrécio</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-white/60 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider ${getSubtextColor()}`}>
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
                      className={`nav-item group ${isActive ? getActiveItemStyle() : getInactiveItemStyle()}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive ? `${getIconActiveStyle()} shadow-sm` : getIconInactiveStyle()
                      }`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">
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
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${getTextColor()}`}>{userName || 'Usuário'}</p>
              <p className={`text-[10px] truncate ${getSubtextColor()}`}>{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`mt-3 w-full text-xs transition-colors text-left ${getSubtextColor()} hover:text-white`}
          >
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}
