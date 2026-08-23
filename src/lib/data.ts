'use client'

/**
 * Camada de dados unificada — persiste no Supabase.
 */

import { createClient } from '@/lib/supabase/client'
import { Transaction, ChatMessage } from '@/types/finance'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// ========================
// TRANSAÇÕES
// ========================

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return []
  }

  return (data || []).map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
    createdAt: t.created_at,
  }))
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
  if (!userId) return []

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('Erro ao buscar mensagens:', error)
    return []
  }

  return (data || []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }))
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
}

// ========================
// CONFIGURAÇÕES DO USUÁRIO
// ========================

export interface UserSettings {
  api_key: string
  ai_provider: string
  ai_model: string
}

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return { api_key: '', ai_provider: 'gemini', ai_model: 'gemini-3.6-flash' }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    console.error('Erro ao buscar settings:', error)
    return { api_key: '', ai_provider: 'gemini', ai_model: 'gemini-3.6-flash' }
  }

  return {
    api_key: data.api_key || '',
    ai_provider: data.ai_provider || 'gemini',
    ai_model: data.ai_model || 'gemini-3.6-flash',
  }
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const supabase = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) console.error('Erro ao salvar configurações:', error)
}
