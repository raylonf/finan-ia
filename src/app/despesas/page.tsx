'use client'

import { useState, useEffect } from 'react'
import { Transaction, CATEGORY_LABELS, CATEGORY_COLORS, Category } from '@/types/finance'
import { getTransactions, deleteTransaction } from '@/lib/data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TransactionForm } from '@/components/TransactionForm'
import {
  Plus, Trash2, Pencil, ArrowDownCircle, Search,
  UtensilsCrossed, Car, Home, Heart, GraduationCap,
  Gamepad2, ShoppingBag, Receipt, MoreHorizontal, TrendingDown,
} from 'lucide-react'

// Map categories to icons
const CATEGORY_ICONS: Record<string, any> = {
  food: UtensilsCrossed,
  transport: Car,
  housing: Home,
  health: Heart,
  education: GraduationCap,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  bills: Receipt,
  other: MoreHorizontal,
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || MoreHorizontal
}

// Group transactions by relative date
function groupByDate(transactions: Transaction[]): { label: string; items: Transaction[] }[] {
  const groups: Record<string, Transaction[]> = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  transactions.forEach((t) => {
    const date = new Date(t.date)
    date.setHours(0, 0, 0, 0)
    let label: string

    if (date.getTime() === today.getTime()) {
      label = 'Hoje'
    } else if (date.getTime() === yesterday.getTime()) {
      label = 'Ontem'
    } else if (date >= weekAgo) {
      label = 'Esta semana'
    } else {
      label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      label = label.charAt(0).toUpperCase() + label.slice(1)
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(t)
  })

  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')

  async function loadData() {
    const all = (await getTransactions()).filter((t) => t.type === 'expense')
    setExpenses(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
  }

  useEffect(() => { loadData() }, [])

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    loadData()
  }

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditing(null)
    loadData()
  }

  const filtered = search
    ? expenses.filter((t) =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        CATEGORY_LABELS[t.category].toLowerCase().includes(search.toLowerCase())
      )
    : expenses

  const total = filtered.reduce((sum, t) => sum + t.amount, 0)
  const grouped = groupByDate(filtered)

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between ml-10 md:ml-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-danger-400 to-danger-600 flex items-center justify-center shadow-sm">
                <ArrowDownCircle className="w-4 h-4 text-white" />
              </div>
              Despesas
            </h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie seus gastos</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova despesa
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="animate-fade-in">
            <TransactionForm
              type="expense"
              editingTransaction={editing}
              onSave={handleSaved}
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </div>
        )}

        {/* Total Card */}
        <div className="card-static p-5 bg-gradient-to-r from-danger-50 to-rose-50 border-danger-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger-100/50 rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-danger-500" />
              <p className="text-sm text-danger-600 font-medium">Total de despesas</p>
            </div>
            <p className="text-3xl font-bold text-danger-700 tracking-tight">{formatCurrency(total)}</p>
            <p className="text-xs text-danger-500 mt-1">{filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}</p>
          </div>
        </div>

        {/* Search */}
        {expenses.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar despesas..."
              className="input-field pl-10"
            />
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <ArrowDownCircle className="w-9 h-9 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 text-lg">Nenhuma despesa registrada</p>
            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
              Adicione pelo botão acima ou diga no chat: &ldquo;Gastei R$ 50 no mercado&rdquo;
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((group, gi) => (
              <div key={group.label} className="animate-fade-in" style={{ animationDelay: `${gi * 0.05}s` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((t) => {
                    const Icon = getCategoryIcon(t.category)
                    const color = CATEGORY_COLORS[t.category]
                    return (
                      <div
                        key={t.id}
                        className="card p-4 flex items-center gap-3 group"
                      >
                        {/* Category icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{t.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {CATEGORY_LABELS[t.category]} · {formatDate(t.date)}
                          </p>
                        </div>

                        {/* Amount + Actions */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-danger-600 text-sm tabular-nums">
                            -{formatCurrency(t.amount)}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                            <button
                              onClick={() => handleEdit(t)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
