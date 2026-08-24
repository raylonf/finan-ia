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
  Menu,
  X,
} from 'lucide-react'
import { OwlIcon } from '@/components/OwlIcon'
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

// Interpolar entre duas cores hex
function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)
  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`
}

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

    // Polling a cada 5s para manter a cor atualizada
    const interval = setInterval(() => {
      getTransactions().then((t) => updateBalanceRatio(t))
    }, 5000)

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

    // Percentual comprometido da receita
    const compromised = income > 0 ? expenses / income : (expenses > 0 ? 1.5 : 0.5)

    // Escala:
    // 0-60% comprometido → verde puro
    // 60-90% → transição verde → neutro
    // 90-100% → transição neutro → vermelho
    // >100% → vermelho intenso

    let ratio: number
    if (compromised <= 0.6) {
      ratio = 1.0 // verde total
    } else if (compromised <= 0.9) {
      // Transição linear de verde (1.0) para neutro (0.5)
      ratio = 1.0 - ((compromised - 0.6) / 0.3) * 0.5
    } else if (compromised <= 1.0) {
      // Transição de neutro (0.5) para vermelho (0.2)
      ratio = 0.5 - ((compromised - 0.9) / 0.1) * 0.3
    } else {
      // Acima de 100% → vermelho intenso
      ratio = Math.max(0, 0.2 - (compromised - 1.0) * 0.2)
    }

    setBalanceRatio(ratio)
  }

  // Atualizar cor quando transações mudam em tempo real
  const refreshBalance = useCallback(() => {
    getTransactions().then((t) => { if (t.length > 0) updateBalanceRatio(t) })
  }, [])
  useRealtimeSync('transactions', refreshBalance)

  // Gerar cor de degradê gradual baseado no ratio (tons warm/sofisticados)
  function getSidebarStyle(): React.CSSProperties {
    const r = balanceRatio

    let topColor: string
    let midColor: string
    let botColor: string

    if (r >= 0.5) {
      // Neutro → Verde/azulado (0.5 a 1.0)
      const t = (r - 0.5) * 2
      topColor = lerpColor('#d4c8be', '#b8d4ce', t) // nude → verde-azulado
      midColor = lerpColor('#e0d6ce', '#c8e0d8', t)
      botColor = lerpColor('#ebe3dc', '#d8ebe4', t)
    } else {
      // Neutro → Rosé/warm red (0.5 a 0)
      const t = (0.5 - r) * 2
      topColor = lerpColor('#d4c8be', '#d4b8b8', t) // nude → rosé
      midColor = lerpColor('#e0d6ce', '#e0cccc', t)
      botColor = lerpColor('#ebe3dc', '#ebdcdc', t)
    }

    return { background: `linear-gradient(180deg, ${topColor} 0%, ${midColor} 50%, ${botColor} 100%)` }
  }

  function getSidebarBorderColor(): string {
    return 'border-black/5'
  }

  function getTextColor(): string {
    return 'text-gray-800'
  }

  function getSubtextColor(): string {
    return 'text-gray-500'
  }

  function getActiveItemStyle(): string {
    return 'bg-white/80 text-gray-900 shadow-sm'
  }

  function getInactiveItemStyle(): string {
    return 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
  }

  function getIconActiveStyle(): string {
    return 'bg-gray-900 shadow-sm'
  }

  function getIconInactiveStyle(): string {
    return 'bg-black/5'
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
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 flex items-center justify-center">
              <OwlIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className={`font-semibold text-base leading-tight ${getTextColor()}`}>Finan IA</h1>
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
              <p className={`px-3 mb-2 text-[10px] font-medium uppercase tracking-wider ${getSubtextColor()}`}>
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
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
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
        <div className="p-4 border-t border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
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
            className="mt-3 w-full text-xs text-gray-400 hover:text-gray-700 transition-colors text-left"
          >
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}
