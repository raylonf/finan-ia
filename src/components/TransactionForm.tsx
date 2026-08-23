'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Transaction, TransactionType, Category, CATEGORY_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types/finance'
import { saveTransaction, updateTransaction } from '@/lib/storage'
import { X } from 'lucide-react'

interface TransactionFormProps {
  type: TransactionType
  editingTransaction?: Transaction | null
  onSave: () => void
  onCancel: () => void
}

export function TransactionForm({ type, editingTransaction, onSave, onCancel }: TransactionFormProps) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const [description, setDescription] = useState(editingTransaction?.description || '')
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '')
  const [category, setCategory] = useState<Category>(editingTransaction?.category || categories[0])
  const [date, setDate] = useState(editingTransaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount || !date) return

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) return

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: new Date(date).toISOString(),
      })
    } else {
      const t: Transaction = {
        id: uuidv4(),
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: new Date(date).toISOString(),
        createdAt: new Date().toISOString(),
      }
      saveTransaction(t)
    }

    onSave()
  }

  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">
          {editingTransaction ? 'Editar' : 'Nova'} {type === 'income' ? 'Receita' : 'Despesa'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'income' ? 'Ex: Salário mensal' : 'Ex: Compras no mercado'}
            className="input-field"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0,00"
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="input-field"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            {editingTransaction ? 'Salvar alterações' : 'Adicionar'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
