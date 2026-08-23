'use client'

import { useState, useEffect } from 'react'
import { Transaction, CATEGORY_LABELS, CATEGORY_COLORS, Category } from '@/types/finance'
import { getTransactions } from '@/lib/data'
import { formatCurrency, getTotalIncome, getTotalExpenses, getBalance, getByCategory } from '@/lib/utils'
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
} from 'lucide-react'

export default function AnalisePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    getTransactions().then(setTransactions)
  }, [])

  const income = getTotalIncome(transactions)
  const expenses = getTotalExpenses(transactions)
  const balance = getBalance(transactions)
  const expensesByCategory = getByCategory(transactions, 'expense')
  const incomeByCategory = getByCategory(transactions, 'income')

  // Insights
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const healthScore = calculateHealthScore(income, expenses, savingsRate)

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-brand-600" />
            Análise Financeira
          </h2>
          <p className="text-sm text-gray-500 mt-1">Visão geral e insights sobre suas finanças</p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-lg">Sem dados para análise</p>
            <p className="text-sm mt-2">Adicione transações nas páginas de Despesas, Receitas ou via Chat para ver sua análise.</p>
          </div>
        ) : (
          <>
            {/* Score de Saúde Financeira */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-600" />
                  Saúde Financeira
                </h3>
                <span className={`text-2xl font-bold ${healthScore >= 70 ? 'text-green-600' : healthScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {healthScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    healthScore >= 70 ? 'bg-green-500' : healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {healthScore >= 70
                  ? '🎉 Excelente! Suas finanças estão bem organizadas.'
                  : healthScore >= 40
                  ? '⚠️ Atenção: há espaço para melhorar seu controle financeiro.'
                  : '🚨 Cuidado: seus gastos estão elevados em relação à renda.'}
              </p>
            </div>

            {/* Cards resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Receitas</p>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(income)}</p>
              </div>
              <div className="card p-4 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Despesas</p>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(expenses)}</p>
              </div>
              <div className={`card p-4 border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Saldo</p>
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <p className={`text-xl font-bold mt-1 ${balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            {/* Taxa de poupança */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Taxa de Poupança</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        savingsRate >= 20 ? 'bg-green-500' : savingsRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                    />
                  </div>
                </div>
                <span className="font-bold text-lg text-gray-800">{savingsRate.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {savingsRate >= 20
                  ? '✅ Você está poupando acima de 20% - excelente!'
                  : savingsRate >= 10
                  ? '⚠️ Entre 10-20%. Tente aumentar para ao menos 20%.'
                  : savingsRate > 0
                  ? '🔴 Abaixo de 10%. Reduza gastos não essenciais.'
                  : '🚨 Você está gastando mais do que ganha!'}
              </p>
            </div>

            {/* Maiores gastos */}
            {topExpenseCategories.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Maiores Gastos
                </h3>
                <div className="space-y-3">
                  {topExpenseCategories.map(([cat, amount], i) => {
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-300 w-6">{i + 1}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">{CATEGORY_LABELS[cat as Category]}</span>
                            <span className="text-gray-600">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat as Category] }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Insights & Recomendações
              </h3>
              <div className="space-y-3">
                {generateInsights(income, expenses, savingsRate, topExpenseCategories).map((insight, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      insight.type === 'success' ? 'bg-green-100 text-green-600' : insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {insight.type === 'success' ? <CheckCircle className="w-3 h-3" /> : insight.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                    </span>
                    <p className="text-gray-700">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function calculateHealthScore(income: number, expenses: number, savingsRate: number): number {
  if (income === 0) return 0
  let score = 50

  // Savings rate contribui até 30 pontos
  if (savingsRate >= 30) score += 30
  else if (savingsRate >= 20) score += 25
  else if (savingsRate >= 10) score += 15
  else if (savingsRate > 0) score += 5
  else score -= 20

  // Relação despesa/receita contribui até 20 pontos
  const ratio = expenses / income
  if (ratio <= 0.5) score += 20
  else if (ratio <= 0.7) score += 15
  else if (ratio <= 0.9) score += 5
  else score -= 10

  return Math.max(0, Math.min(100, score))
}

function generateInsights(
  income: number,
  expenses: number,
  savingsRate: number,
  topCategories: [string, number][]
): { type: 'success' | 'warning' | 'tip'; text: string }[] {
  const insights: { type: 'success' | 'warning' | 'tip'; text: string }[] = []

  if (savingsRate >= 20) {
    insights.push({ type: 'success', text: 'Sua taxa de poupança está ótima! Continue assim.' })
  } else if (savingsRate < 10 && income > 0) {
    insights.push({ type: 'warning', text: 'Sua taxa de poupança está baixa. Tente reduzir gastos variáveis.' })
  }

  if (expenses > income) {
    insights.push({ type: 'warning', text: 'Suas despesas ultrapassam suas receitas. Revise seus gastos urgentemente.' })
  }

  if (topCategories.length > 0) {
    const [topCat] = topCategories[0]
    const pct = income > 0 ? (topCategories[0][1] / income) * 100 : 0
    if (pct > 30) {
      insights.push({ type: 'warning', text: `${CATEGORY_LABELS[topCat as Category]} representa ${pct.toFixed(0)}% da sua renda. Considere alternativas para reduzir.` })
    }
  }

  insights.push({ type: 'tip', text: 'Mantenha uma reserva de emergência de 3 a 6 meses de despesas.' })
  insights.push({ type: 'tip', text: 'Considere a regra 50/30/20: necessidades, desejos e poupança.' })

  return insights
}
