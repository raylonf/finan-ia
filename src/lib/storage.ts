'use client'

import { Transaction, ChatMessage } from '@/types/finance'

const KEYS = {
  TRANSACTIONS: 'finan_ia_transactions',
  MESSAGES: 'finan_ia_messages',
}

// --- Transações ---
export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(KEYS.TRANSACTIONS)
  return data ? JSON.parse(data) : []
}

export function saveTransaction(t: Transaction): void {
  const list = getTransactions()
  list.push(t)
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

export function updateTransaction(updated: Transaction): void {
  const list = getTransactions().map((t) => (t.id === updated.id ? updated : t))
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

export function deleteTransaction(id: string): void {
  const list = getTransactions().filter((t) => t.id !== id)
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list))
}

// --- Mensagens ---
export function getMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(KEYS.MESSAGES)
  return data ? JSON.parse(data) : []
}

export function saveMessage(msg: ChatMessage): void {
  const list = getMessages()
  list.push(msg)
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(list))
}

export function clearMessages(): void {
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]))
}
