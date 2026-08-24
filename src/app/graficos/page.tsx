'use client'

import { useState, useEffect } from 'react'
import { Transaction, CATEGORY_LABELS, CATEGORY_COLORS, Category } from '@/types/finance'
import { getTransactions } from '@/lib/data'
import { formatCurrency, getByCategory, getMonthlyData, getTotalExpenses } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

export default function GraficosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getTransactions().then((data) => { setTransactions(data); setLoaded(true) })
  }, [])

  const monthlyData = getMonthlyData(transactions)
  const expensesByCategory = getByCategory(transactions, 'expense')
  const incomeByCategory = getByCategory(transactions, 'income')
  const totalExpenses = getTotalExpenses(transactions)

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando gráficos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="ml-10 md:ml-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Gráficos
          </h2>
          <p className="text-sm text-gray-500 mt-1">Visualização dos seus dados financeiros</p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-lg">Sem dados para exibir</p>
            <p className="text-sm mt-2">Adicione transações para ver os gráficos.</p>
          </div>
        ) : (
          <>
            {/* Gráfico Mensal */}
            {monthlyData.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Evolução Mensal</h3>
                <div className="flex gap-4 text-xs mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-gray-600">Receitas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-400" />
                    <span className="text-gray-600">Despesas</span>
                  </div>
                </div>
                <BarChartCustom data={monthlyData} />
              </div>
            )}

            {/* Despesas por Categoria - Donut simplificado */}
            {Object.keys(expensesByCategory).length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Despesas por Categoria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Barra visual */}
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => {
                        const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{CATEGORY_LABELS[cat as Category]}</span>
                              <span className="font-medium text-gray-800">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                              <div
                                className="h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: CATEGORY_COLORS[cat as Category],
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* Lista com valores */}
                  <div className="space-y-2">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }}
                            />
                            <span className="text-sm text-gray-700">{CATEGORY_LABELS[cat as Category]}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Receitas por Categoria */}
            {Object.keys(incomeByCategory).length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Receitas por Fonte</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(incomeByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => (
                      <div key={cat} className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600 mb-1">{CATEGORY_LABELS[cat as Category]}</p>
                        <p className="font-bold text-green-700 text-sm">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Comparativo mês a mês */}
            {monthlyData.length > 1 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Comparativo por Mês</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="pb-2 text-gray-500 font-medium">Mês</th>
                        <th className="pb-2 text-gray-500 font-medium">Receitas</th>
                        <th className="pb-2 text-gray-500 font-medium">Despesas</th>
                        <th className="pb-2 text-gray-500 font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((d) => (
                        <tr key={d.month} className="border-b border-gray-50">
                          <td className="py-2.5 font-medium text-gray-700">{d.month}</td>
                          <td className="py-2.5 text-green-600">{formatCurrency(d.income)}</td>
                          <td className="py-2.5 text-red-600">{formatCurrency(d.expenses)}</td>
                          <td className={`py-2.5 font-semibold ${d.income - d.expenses >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(d.income - d.expenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Componente de gráfico de barras customizado
function BarChartCustom({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1)

  return (
    <div className="flex items-end gap-4 h-48">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex gap-1 items-end h-40">
            <div className="flex-1 flex flex-col justify-end items-center">
              <span className="text-xs text-gray-500 mb-1">{formatCurrency(d.income)}</span>
              <div
                className="w-full bg-green-500 rounded-t-md transition-all duration-500"
                style={{ height: `${(d.income / maxVal) * 100}%`, minHeight: d.income > 0 ? '4px' : '0' }}
              />
            </div>
            <div className="flex-1 flex flex-col justify-end items-center">
              <span className="text-xs text-gray-500 mb-1">{formatCurrency(d.expenses)}</span>
              <div
                className="w-full bg-red-400 rounded-t-md transition-all duration-500"
                style={{ height: `${(d.expenses / maxVal) * 100}%`, minHeight: d.expenses > 0 ? '4px' : '0' }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-500 font-medium mt-1">{d.month}</span>
        </div>
      ))}
    </div>
  )
}
