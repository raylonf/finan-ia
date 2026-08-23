'use client'

import { Transaction, ChatMessage } from '@/types/finance'

const KEYS = {
  TRANSACTIONS: 'finan_ia_transactions',
  MESSAGES: 'finan_ia_messages',
}

/**
 * Parse seguro de JSON do localStorage.
 * Retorna fallback se dados estiverem corrompidos ou inválidos.
 */
function safeParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback
  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? (parsed as T) : fallback
  } catch (error) {
    console.error('[Finan IA] Dados corrompidos no localStorage:', error)
    return fallback
  }
}

/**
 * Salva dados no localStorage com tratamento de quota exceeded.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error('[Finan IA] Erro ao salvar no localStorage (quota excedida?):', error)
    return false
  }
}

// --- Transações ---
export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return []
  return safeParse<Transaction[]>(localStorage.getItem(KEYS.TRANSACTIONS), [])
}

export function saveTransaction(t: Transaction): void {
  const list = getTransactions()
  list.push(t)
  safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

export function updateTransaction(updated: Transaction): void {
  const list = getTransactions().map((t) => (t.id === updated.id ? updated : t))
  safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

export function deleteTransaction(id: string): void {
  const list = getTransactions().filter((t) => t.id !== id)
  safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

// --- Mensagens ---
export function getMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  return safeParse<ChatMessage[]>(localStorage.getItem(KEYS.MESSAGES), [])
}

export function saveMessage(msg: ChatMessage): void {
  const list = getMessages()
  list.push(msg)
  safeSetItem(KEYS.MESSAGES, JSON.stringify(list))
}

export function clearMessages(): void {
  safeSetItem(KEYS.MESSAGES, JSON.stringify([]))
}

// --- Export/Import (backup) ---
export function exportAllData(): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: getTransactions(),
    messages: getMessages(),
  }, null, 2)
}

export function importData(jsonString: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonString)

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Formato inválido' }
    }

    if (Array.isArray(data.transactions)) {
      safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions))
    }

    if (Array.isArray(data.messages)) {
      safeSetItem(KEYS.MESSAGES, JSON.stringify(data.messages))
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Arquivo JSON inválido' }
  }
}
