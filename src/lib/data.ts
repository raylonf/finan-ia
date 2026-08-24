'use client'

/**
 * Camada de dados com cache local (stale-while-revalidate).
 * - Mostra dados do cache imediatamente
 * - Busca do Supabase em background e atualiza o cache
 */

import { createClient } from '@/lib/supabase/client'
import { Transaction, ChatMessage } from '@/types/finance'

const CACHE_KEYS = {
  TRANSACTIONS: 'finan_ia_cache_transactions',
  MESSAGES: 'finan_ia_cache_messages',
  SETTINGS: 'finan_ia_cache_settings',
}

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// --- Cache helpers ---
function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// ========================
// TRANSAÇÕES
// ========================

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return getCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS) || []

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return getCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS) || []
  }

  const transactions = (data || []).map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
    createdAt: t.created_at,
  }))

  setCache(CACHE_KEYS.TRANSACTIONS, transactions)
  return transactions
}

export function getCachedTransactions(): Transaction[] {
  return getCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS) || []
}

export async function saveTransaction(t: { type: string; category: string; description: string; amount: number; date: string }): Promise<void> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount,
    date: t.date,
  })

  if (error) console.error('Erro ao salvar transação:', error)
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) console.error('Erro ao deletar transação:', error)
}

export async function updateTransaction(t: Transaction): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('transactions')
    .update({
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      date: t.date,
    })
    .eq('id', t.id)

  if (error) console.error('Erro ao atualizar transação:', error)
}

// ========================
// MENSAGENS DO CHAT
// ========================

export async function getMessages(): Promise<ChatMessage[]> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return getCache<ChatMessage[]>(CACHE_KEYS.MESSAGES) || []

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('Erro ao buscar mensagens:', error)
    return getCache<ChatMessage[]>(CACHE_KEYS.MESSAGES) || []
  }

  const messages = (data || []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }))

  setCache(CACHE_KEYS.MESSAGES, messages)
  return messages
}

export function getCachedMessages(): ChatMessage[] {
  return getCache<ChatMessage[]>(CACHE_KEYS.MESSAGES) || []
}

export async function saveMessage(msg: { role: string; content: string }): Promise<void> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  const { error } = await supabase.from('messages').insert({
    user_id: userId,
    role: msg.role,
    content: msg.content,
  })

  if (error) console.error('Erro ao salvar mensagem:', error)
}

export async function clearMessages(): Promise<void> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  const { error } = await supabase.from('messages').delete().eq('user_id', userId)
  if (error) console.error('Erro ao limpar mensagens:', error)
  setCache(CACHE_KEYS.MESSAGES, [])
}

// ========================
// CONFIGURAÇÕES DO USUÁRIO
// ========================

export interface UserSettings {
  api_key: string
  ai_provider: string
  ai_model: string
}

const DEFAULT_SETTINGS: UserSettings = { api_key: '', ai_provider: 'gemini', ai_model: 'gemini-3.6-flash' }

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return getCache<UserSettings>(CACHE_KEYS.SETTINGS) || DEFAULT_SETTINGS

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return getCache<UserSettings>(CACHE_KEYS.SETTINGS) || DEFAULT_SETTINGS
  }

  const settings: UserSettings = {
    api_key: data.api_key || '',
    ai_provider: data.ai_provider || 'gemini',
    ai_model: data.ai_model || 'gemini-3.6-flash',
  }

  setCache(CACHE_KEYS.SETTINGS, settings)
  return settings
}

export function getCachedSettings(): UserSettings {
  return getCache<UserSettings>(CACHE_KEYS.SETTINGS) || DEFAULT_SETTINGS
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  // Atualizar cache imediatamente
  const current = getCache<UserSettings>(CACHE_KEYS.SETTINGS) || DEFAULT_SETTINGS
  setCache(CACHE_KEYS.SETTINGS, { ...current, ...settings })

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) console.error('Erro ao salvar configurações:', error)
}
