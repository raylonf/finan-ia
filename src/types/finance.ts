export type TransactionType = 'income' | 'expense'

export type Category =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'food'
  | 'transport'
  | 'housing'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'other'

export interface Transaction {
  id: string
  type: TransactionType
  category: Category
  description: string
  amount: number
  date: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
}

export const CATEGORY_LABELS: Record<Category, string> = {
  salary: 'Salário',
  freelance: 'Freelance',
  investment: 'Investimento',
  food: 'Alimentação',
  transport: 'Transporte',
  housing: 'Moradia',
  health: 'Saúde',
  education: 'Educação',
  entertainment: 'Entretenimento',
  shopping: 'Compras',
  bills: 'Contas',
  other: 'Outros',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  salary: '#22c55e',
  freelance: '#3b82f6',
  investment: '#8b5cf6',
  food: '#f59e0b',
  transport: '#06b6d4',
  housing: '#ec4899',
  health: '#ef4444',
  education: '#14b8a6',
  entertainment: '#f97316',
  shopping: '#a855f7',
  bills: '#64748b',
  other: '#6b7280',
}

export const INCOME_CATEGORIES: Category[] = ['salary', 'freelance', 'investment', 'other']
export const EXPENSE_CATEGORIES: Category[] = ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'shopping', 'bills', 'other']
