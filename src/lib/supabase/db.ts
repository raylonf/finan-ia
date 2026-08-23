'use client'

import { createClient } from './client'
import { Transaction, ChatMessage } from '@/types/finance'

const supabase = createClient()

// --- Transações ---
export async function getTransactionsDB(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
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

export async function saveTransactionDB(t: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount,
    date: t.date,
  })

  if (error) console.error('Erro ao salvar transação:', error)
}

export async function deleteTransactionDB(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) console.error('Erro ao deletar transação:', error)
}

export async function updateTransactionDB(t: Transaction): Promise<void> {
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

// --- Mensagens do Chat ---
export async function getMessagesDB(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
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

export async function saveMessageDB(msg: { role: string; content: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('messages').insert({
    user_id: user.id,
    role: msg.role,
    content: msg.content,
  })

  if (error) console.error('Erro ao salvar mensagem:', error)
}

export async function clearMessagesDB(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', user.id)

  if (error) console.error('Erro ao limpar mensagens:', error)
}

// --- Configurações do Usuário ---
export interface UserSettings {
  api_key: string
  ai_provider: string
  ai_model: string
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .single()

  if (error || !data) return null

  return {
    api_key: data.api_key || '',
    ai_provider: data.ai_provider || 'gemini',
    ai_model: data.ai_model || 'gemini-3.6-flash',
  }
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) console.error('Erro ao salvar configurações:', error)
}
