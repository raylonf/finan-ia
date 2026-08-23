'use client'

import { useState, useEffect } from 'react'
import { Transaction, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/finance'
import { getTransactions, deleteTransaction } from '@/lib/storage'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TransactionForm } from '@/components/TransactionForm'
import { Plus, Trash2, Pencil, ArrowUpCircle, Search } from 'lucide-react'

export default function ReceitasPage() {
  const [incomes, setIncomes] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')

  function loadData() {
    const all = getTransactions().filter((t) => t.type === 'income')
    setIncomes(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
  }

  useEffect(() => { loadData() }, [])

  function handleDelete(id: string) {
    deleteTransaction(id)
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
    ? incomes.filter((t) =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        CATEGORY_LABELS[t.category].toLowerCase().includes(search.toLowerCase())
      )
    : incomes

  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowUpCircle className="w-6 h-6 text-green-500" />
              Receitas
            </h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie suas fontes de renda</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova receita
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <TransactionForm
            type="income"
            editingTransaction={editing}
            onSave={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        )}

        {/* Total Card */}
        <div className="card p-4 bg-green-50 border-green-100">
          <p className="text-sm text-green-600 font-medium">Total de receitas</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(total)}</p>
          <p className="text-xs text-green-500 mt-1">{filtered.length} transações</p>
        </div>

        {/* Search */}
        {incomes.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar receitas..."
              className="input-field pl-10"
            />
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ArrowUpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma receita registrada</p>
              <p className="text-sm mt-1">Adicione pelo botão acima ou use o chat</p>
            </div>
          )}

          {filtered.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[t.category] }}
                />
                <div>
                  <p className="font-medium text-gray-800 text-sm">{t.description}</p>
                  <p className="text-xs text-gray-400">{CATEGORY_LABELS[t.category]} • {formatDate(t.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-green-600 text-sm">+{formatCurrency(t.amount)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
