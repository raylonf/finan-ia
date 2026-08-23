'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ChatMessage, Transaction } from '@/types/finance'
import { getMessages, saveMessage, clearMessages, getTransactions, saveTransaction } from '@/lib/storage'
import { buildFinancialContext } from '@/lib/utils'
import { Send, Trash2, Bot, User, MessageSquare } from 'lucide-react'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(getMessages())
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    saveMessage(userMsg)
    setLoading(true)

    try {
      const transactions = getTransactions()
      const ctx = buildFinancialContext(transactions)

      // Pegar configurações de IA do localStorage
      const savedApiKey = localStorage.getItem('finan_ia_api_key') || ''
      const savedModel = localStorage.getItem('finan_ia_model') || 'gemini-3.6-flash'
      const savedProvider = localStorage.getItem('finan_ia_provider') || 'gemini'

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          financialContext: ctx,
          apiKey: savedApiKey,
          model: savedModel,
          provider: savedProvider,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Detectar transação
      const match = data.message.match(/\[TRANSACTION\]\s*([\s\S]*?)\s*\[\/TRANSACTION\]/)
      if (match) {
        try {
          const td = JSON.parse(match[1])
          const t: Transaction = {
            id: uuidv4(),
            type: td.type,
            category: td.category,
            description: td.description,
            amount: td.amount,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
          saveTransaction(t)
        } catch {}
      }

      const aiMsg: ChatMessage = { id: uuidv4(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() }
      setMessages((prev) => [...prev, aiMsg])
      saveMessage(aiMsg)
    } catch {
      const errMsg: ChatMessage = { id: uuidv4(), role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.', timestamp: new Date().toISOString() }
      setMessages((prev) => [...prev, errMsg])
      saveMessage(errMsg)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    clearMessages()
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    'Recebi R$ 5.000 de salário',
    'Gastei R$ 200 no mercado',
    'Como estão minhas finanças?',
    'Me dê dicas de economia',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-800">Chat com Finan IA</h2>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors" title="Limpar conversa">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">Olá! Sou o Finan IA</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Me conte sobre suas finanças. Registro transações, analiso seus gastos e dou dicas personalizadas.
            </p>
            <div className="grid gap-2 w-full max-w-sm">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => handleSend(), 0) }}
                  className="text-left text-sm px-4 py-2.5 rounded-lg bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-brand-600' : 'bg-gray-100'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-600" />}
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content.replace(/\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]/g, '').trim()}
              </div>
              <div className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-brand-200' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="chat-bubble-assistant">
              <div className="flex gap-1 py-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Diga algo sobre suas finanças..."
            rows={1}
            disabled={loading}
            className="input-field resize-none flex-1"
            aria-label="Mensagem"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary p-2.5 rounded-lg"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
