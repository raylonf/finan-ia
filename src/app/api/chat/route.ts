import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/** Timeout para chamadas a APIs externas (30 segundos) */
const AI_TIMEOUT_MS = 30_000

/** Limites de validação */
const MAX_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 5000
const MAX_CONTEXT_LENGTH = 10000
const VALID_PROVIDERS = ['gemini', 'openai'] as const
const VALID_MODELS = [
  'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro',
  'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo',
] as const

const SYSTEM_PROMPT = `Você é o Finan IA, um assistente financeiro pessoal inteligente e amigável. Seu papel é:

1. Analisar as finanças do usuário com base nos dados fornecidos
2. Dar feedback construtivo sobre hábitos de gastos
3. Sugerir melhorias para economia e investimentos
4. Responder perguntas sobre finanças pessoais
5. Ajudar a registrar transações quando o usuário mencionar gastos ou receitas

Regras:
- Sempre responda em português brasileiro
- Seja empático e encorajador
- Dê conselhos práticos e acionáveis
- Formate valores em Real (R$)
- Use emojis com moderação

Se o usuário mencionar uma transação (gasto ou receita), extraia e responda com:
[TRANSACTION]
{"type":"income|expense","category":"categoria","description":"desc","amount":valor}
[/TRANSACTION]

Categorias válidas para despesas: food, transport, housing, health, education, entertainment, shopping, bills, other
Categorias válidas para receitas: salary, freelance, investment, other

Inclua esse bloco APENAS quando detectar claramente uma transação. Continue a conversa normalmente.`

interface ChatMessage {
  role: string
  content: string
}

/**
 * Valida e sanitiza os inputs da request.
 * Retorna null se válido, ou um NextResponse de erro se inválido.
 */
function validateRequest(body: unknown): {
  messages: ChatMessage[]
  financialContext: string
  apiKey: string
  model: string
  provider: 'gemini' | 'openai'
} | NextResponse {
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { messages, financialContext, apiKey, model, provider } = body as Record<string, unknown>

  // Validar messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages é obrigatório' }, { status: 400 })
  }

  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: `Máximo de ${MAX_MESSAGES} mensagens por request` }, { status: 400 })
  }

  const validatedMessages: ChatMessage[] = messages
    .filter((m): m is { role: string; content: string } =>
      m && typeof m === 'object' &&
      typeof (m as any).role === 'string' &&
      typeof (m as any).content === 'string'
    )
    .map((m) => ({
      role: ['user', 'assistant'].includes(m.role) ? m.role : 'user',
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }))

  if (validatedMessages.length === 0) {
    return NextResponse.json({ error: 'Nenhuma mensagem válida' }, { status: 400 })
  }

  // Validar provider
  const validProvider = (typeof provider === 'string' && VALID_PROVIDERS.includes(provider as any))
    ? provider as 'gemini' | 'openai'
    : 'gemini'

  // Validar model (aceita valores da lista ou usa default)
  const validModel = (typeof model === 'string' && model.length <= 50)
    ? model
    : validProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'

  // Sanitizar context
  const validContext = typeof financialContext === 'string'
    ? financialContext.slice(0, MAX_CONTEXT_LENGTH)
    : ''

  // API key
  const validApiKey = typeof apiKey === 'string' ? apiKey.trim().slice(0, 200) : ''
  const resolvedKey = validApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || ''

  return {
    messages: validatedMessages,
    financialContext: validContext,
    apiKey: resolvedKey,
    model: validModel,
    provider: validProvider,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateRequest(body)

    // Se retornou NextResponse, é um erro de validação
    if (validation instanceof NextResponse) {
      return validation
    }

    const { messages, financialContext, apiKey, model, provider } = validation
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!apiKey || apiKey === 'sua-chave-aqui' || apiKey === 'sua-chave-gemini-aqui') {
      const lastMsg = messages[messages.length - 1]?.content || ''
      return NextResponse.json({ message: generateDemo(lastMsg, financialContext) })
    }

    const systemContent = financialContext
      ? `${SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS ---\n${financialContext}`
      : SYSTEM_PROMPT

    let responseText: string

    if (provider === 'gemini') {
      responseText = await callGemini(apiKey, model, systemContent, messages, attachments)
    } else {
      responseText = await callOpenAI(apiKey, model, systemContent, messages)
    }

    return NextResponse.json({ message: responseText })
  } catch (error: unknown) {
    console.error('Erro na API chat:', error instanceof Error ? error.message : error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Tempo limite excedido. A IA demorou para responder.' },
        { status: 504 },
      )
    }

    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 })
  }
}

// --- Google Gemini ---
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  attachments: { name: string; mimeType: string; base64: string }[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1]?.content || ''

  // Montar parts: texto + arquivos inline
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

  if (lastMessage) {
    parts.push({ text: lastMessage })
  }

  if (attachments && attachments.length > 0) {
    for (const file of attachments) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64,
        },
      })
    }
    if (!lastMessage) {
      parts.unshift({ text: `Analise este(s) arquivo(s) no contexto financeiro.` })
    }
  }

  const chat = genModel.startChat({ history })

  const result = await Promise.race([
    chat.sendMessage(parts as never),
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        const err = new Error('Tempo limite excedido ao chamar Gemini')
        err.name = 'AbortError'
        reject(err)
      }, AI_TIMEOUT_MS)
    ),
  ])

  return result.response.text() || 'Desculpe, não consegui processar.'
}

// --- OpenAI (via fetch com timeout) ---
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `OpenAI retornou ${res.status}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar.'
  } finally {
    clearTimeout(timeoutId)
  }
}

// --- Modo Demo ---
function generateDemo(msg: string, ctx: string): string {
  const lower = msg.toLowerCase()

  if (lower.includes('gastei') || lower.includes('paguei') || lower.includes('comprei')) {
    const amount = extractAmount(msg)
    const cat = detectExpenseCategory(lower)
    if (amount) {
      return `Registrei essa despesa para você! 📝\n\n[TRANSACTION]\n{"type":"expense","category":"${cat}","description":"${msg.slice(0, 60)}","amount":${amount}}\n[/TRANSACTION]\n\n💡 Dica: Acompanhe seus gastos regularmente para identificar onde pode economizar.`
    }
    return `Entendi que teve um gasto. Pode me dizer o valor exato? Assim registro para você. 📝`
  }

  if (lower.includes('recebi') || lower.includes('ganhei') || lower.includes('salário') || lower.includes('salario')) {
    const amount = extractAmount(msg)
    const cat = lower.includes('freelance') ? 'freelance' : lower.includes('investimento') ? 'investment' : 'salary'
    if (amount) {
      return `Ótimo! Receita registrada! 🎉\n\n[TRANSACTION]\n{"type":"income","category":"${cat}","description":"${msg.slice(0, 60)}","amount":${amount}}\n[/TRANSACTION]\n\nContinue acompanhando suas finanças!`
    }
    return `Que boa notícia! 🎉 Pode me dizer o valor para eu registrar?`
  }

  if (lower.includes('análise') || lower.includes('analise') || lower.includes('resumo') || lower.includes('como estou')) {
    if (ctx && ctx.length > 50) {
      return `📊 **Aqui está sua análise financeira:**\n\n${ctx}\n\n💡 **Recomendações:**\n1. Mantenha uma reserva de emergência de 6 meses de despesas\n2. Tente manter gastos fixos abaixo de 50% da renda\n3. Destine pelo menos 20% para investimentos\n\nQuer detalhes sobre algum ponto?`
    }
    return `Ainda não tenho dados suficientes. Comece registrando transações:\n\n• "Recebi R$ 5.000 de salário"\n• "Gastei R$ 200 no mercado"\n• "Paguei R$ 1.200 de aluguel"\n\nAssim posso analisar suas finanças! 📈`
  }

  if (lower.includes('dica') || lower.includes('conselho') || lower.includes('economizar')) {
    return `💡 **Dicas do Finan IA:**\n\n1. **Regra 50/30/20:** 50% necessidades, 30% desejos, 20% poupança\n2. **Registre tudo:** Consciência é o primeiro passo\n3. **Fundo de emergência:** 3 a 6 meses de despesas\n4. **Evite parcelamentos:** Se não pode à vista, repense\n5. **Invista cedo:** Mesmo R$ 100/mês faz diferença\n\nPosso ajudar com algo específico?`
  }

  if (lower.includes('oi') || lower.includes('olá') || lower.includes('ola') || lower === '') {
    return `Olá! 👋 Sou o **Finan IA**, seu assistente financeiro pessoal.\n\nPosso te ajudar a:\n📝 Registrar gastos e receitas\n📊 Analisar suas finanças\n💡 Dar dicas personalizadas\n🎯 Acompanhar seus objetivos\n\nÉ só me contar sobre suas finanças!`
  }

  return `Posso te ajudar com:\n\n• **Registrar transações** - me diga seus gastos e receitas\n• **Análise financeira** - peça um resumo\n• **Dicas** - pergunte sobre economia e investimentos\n\nÉ só falar! 😊`
}

function extractAmount(text: string): number | null {
  const patterns = [/R\$\s*([\d.,]+)/i, /(\d+[.,]\d{2})/, /(\d+)\s*(reais|real)/i, /(\d+)\s*mil/i]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const val = m[1].replace('.', '').replace(',', '.')
      if (text.toLowerCase().includes('mil')) return parseFloat(val) * 1000
      return parseFloat(val)
    }
  }
  return null
}

function detectExpenseCategory(text: string): string {
  if (/mercado|comida|restaurante|almoço|jantar|lanche|ifood/.test(text)) return 'food'
  if (/uber|gasolina|ônibus|metrô|transporte|estacionamento/.test(text)) return 'transport'
  if (/aluguel|condomínio|casa|apartamento/.test(text)) return 'housing'
  if (/médico|remédio|farmácia|saúde|plano/.test(text)) return 'health'
  if (/curso|livro|escola|faculdade/.test(text)) return 'education'
  if (/netflix|cinema|show|lazer|spotify|jogo/.test(text)) return 'entertainment'
  if (/roupa|shopping|compra|tênis|celular/.test(text)) return 'shopping'
  if (/conta|luz|água|internet|telefone/.test(text)) return 'bills'
  return 'other'
}
