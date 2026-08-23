'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ChatMessage, Transaction } from '@/types/finance'
import { getMessages, saveMessage, clearMessages, getTransactions, saveTransaction } from '@/lib/storage'
import { buildFinancialContext } from '@/lib/utils'
import { Send, Trash2, Bot, User, MessageSquare, Paperclip, X, FileText, Image, Film, Mic, Square } from 'lucide-react'

interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  base64: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())

        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setAttachments((prev) => [
            ...prev,
            {
              id: uuidv4(),
              name: `audio_${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-')}.webm`,
              type: 'audio/webm',
              size: blob.size,
              base64,
            },
          ])
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      // Limpa os chunks para não adicionar o áudio
      chunksRef.current = []
    }
    const stream = mediaRecorderRef.current?.stream
    if (stream) stream.getTracks().forEach((track) => track.stop())
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      // Limite de 20MB por arquivo
      if (file.size > 20 * 1024 * 1024) {
        alert(`Arquivo "${file.name}" excede o limite de 20MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachments((prev) => [
          ...prev,
          {
            id: uuidv4(),
            name: file.name,
            type: file.type,
            size: file.size,
            base64,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleSend() {
    if ((!input.trim() && attachments.length === 0) || loading) return
    const text = input.trim()
    setInput('')

    // Monta conteúdo da mensagem para exibição
    const attachmentNames = attachments.map((a) => `📎 ${a.name}`).join('\n')
    const displayContent = [text, attachmentNames].filter(Boolean).join('\n')

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    saveMessage(userMsg)

    const currentAttachments = [...attachments]
    setAttachments([])
    setLoading(true)

    try {
      const transactions = getTransactions()
      const ctx = buildFinancialContext(transactions)

      const savedApiKey = localStorage.getItem('finan_ia_api_key') || ''
      const savedModel = localStorage.getItem('finan_ia_model') || 'gemini-2.0-flash'
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
          attachments: currentAttachments.map((a) => ({
            name: a.name,
            mimeType: a.type,
            base64: a.base64,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Detectar transação
      const match = data.message.match(/\[TRANSACTION\]\s*([\s\S]*?)\s*\[\/TRANSACTION\]/)
      if (match) {
        try {
          const td = JSON.parse(match[1])
          const validTypes = ['income', 'expense']
          const validCategories = ['salary', 'freelance', 'investment', 'food', 'transport', 'housing', 'health', 'education', 'entertainment', 'shopping', 'bills', 'other']

          if (validTypes.includes(td.type) && validCategories.includes(td.category) && typeof td.amount === 'number' && td.amount > 0) {
            const t: Transaction = {
              id: uuidv4(),
              type: td.type,
              category: td.category,
              description: (td.description || '').trim().slice(0, 200),
              amount: Math.round(td.amount * 100) / 100,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            }
            saveTransaction(t)
          }
        } catch {}
      }

      const aiMsg: ChatMessage = { id: uuidv4(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() }
      setMessages((prev) => [...prev, aiMsg])
      saveMessage(aiMsg)
    } catch {
      const errMsg: ChatMessage = { id: uuidv4(), role: 'assistant', content: 'Desculpe, ocorreu um erro. Verifique sua chave de API nas configurações e tente novamente.', timestamp: new Date().toISOString() }
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

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
    if (type.startsWith('video/')) return <Film className="w-4 h-4 text-purple-500" />
    if (type.startsWith('audio/')) return <Mic className="w-4 h-4 text-green-500" />
    return <FileText className="w-4 h-4 text-orange-500" />
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
              Você também pode enviar arquivos (PDF, imagens, áudio, vídeo).
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

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
            {attachments.map((file) => (
              <div key={file.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {getFileIcon(file.type)}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={() => removeAttachment(file.id)} className="text-gray-400 hover:text-red-500 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        {recording ? (
          /* Barra de gravação */
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button
              onClick={cancelRecording}
              className="flex-shrink-0 p-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Cancelar gravação"
              aria-label="Cancelar gravação"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-lg border border-red-100">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-700">Gravando...</span>
              <span className="text-sm text-red-500 font-mono">{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex-shrink-0 p-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="Parar e enviar"
              aria-label="Parar gravação"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        ) : (
          /* Input normal */
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            {/* Botão de anexo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex-shrink-0 p-2.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
              title="Anexar arquivo (imagem, PDF, áudio, vídeo)"
              aria-label="Anexar arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

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

            {/* Botão de gravar áudio */}
            <button
              onClick={startRecording}
              disabled={loading}
              className="flex-shrink-0 p-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Gravar áudio"
              aria-label="Gravar áudio"
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || loading}
              className="btn-primary p-2.5 rounded-lg"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 text-center mt-2">
          Suporta: imagens, PDF, áudio, vídeo, documentos (até 20MB)
        </p>
      </div>
    </div>
  )
}
