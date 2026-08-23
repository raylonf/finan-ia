import { Transaction, MonthlyData, Category, CATEGORY_LABELS } from '@/types/finance'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpenses(transactions)
}

export function getByCategory(transactions: Transaction[], type: 'expense' | 'income'): Record<Category, number> {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<Category, number>)
}

export function getMonthlyData(transactions: Transaction[]): MonthlyData[] {
  const map = new Map<string, { income: number; expenses: number }>()

  transactions.forEach((t) => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { income: 0, expenses: 0 })
    const entry = map.get(key)!
    if (t.type === 'income') entry.income += t.amount
    else entry.expenses += t.amount
  })

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const [year, month] = key.split('-')
      return {
        month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
        income: data.income,
        expenses: data.expenses,
      }
    })
}

export function buildFinancialContext(transactions: Transaction[]): string {
  const income = getTotalIncome(transactions)
  const expenses = getTotalExpenses(transactions)
  const balance = income - expenses
  const byCategory = getByCategory(transactions, 'expense')

  let ctx = `Renda total: ${formatCurrency(income)}\n`
  ctx += `Despesas totais: ${formatCurrency(expenses)}\n`
  ctx += `Saldo: ${formatCurrency(balance)}\n\n`

  if (Object.keys(byCategory).length > 0) {
    ctx += `Gastos por categoria:\n`
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, amount]) => {
        ctx += `- ${CATEGORY_LABELS[cat as Category]}: ${formatCurrency(amount)}\n`
      })
  }

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  if (recent.length > 0) {
    ctx += `\nÚltimas transações:\n`
    recent.forEach((t) => {
      const tipo = t.type === 'income' ? '+ Receita' : '- Despesa'
      ctx += `${tipo}: ${t.description} ${formatCurrency(t.amount)} (${formatDate(t.date)})\n`
    })
  }

  return ctx
}
