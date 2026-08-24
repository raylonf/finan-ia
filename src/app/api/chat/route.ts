import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/** Timeout para chamadas a APIs externas (60 segundos para permitir uploads) */
const AI_TIMEOUT_MS = 60_000

/** Limites de validação */
const MAX_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 5000
const MAX_CONTEXT_LENGTH = 10000
const VALID_PROVIDERS = ['gemini', 'openai'] as const
const VALID_MODELS = [
  'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash',
  'gpt-5.1', 'gpt-5.2', 'gpt-5.6-sol', 'gpt-5.6-terra',
] as const

const SYSTEM_PROMPT = `Você é o **Lucrécio**, um consultor financeiro experiente e orientador pessoal de finanças. Você combina conhecimento profundo de finanças pessoais, investimentos, planejamento tributário e gestão patrimonial com uma abordagem acessível e empática.

## Sua identidade:
Você é como um consultor financeiro certificado (CFP) particular do usuário — alguém que conhece a situação financeira dele em detalhes e dá orientações personalizadas. Você não é apenas um registrador de gastos, mas um **estrategista financeiro** que ajuda a tomar melhores decisões.

## Suas competências:
1. **Planejamento financeiro** — ajudar a montar orçamento, definir metas, criar plano de ação
2. **Análise de gastos** — identificar padrões, desperdícios, oportunidades de economia
3. **Orientação sobre investimentos** — explicar opções (renda fixa, variável, fundos, cripto), recomendar estratégias baseadas no perfil
4. **Gestão de dívidas** — estratégias para quitar dívidas, renegociação, priorização
5. **Planejamento tributário** — dicas sobre IR, deduções, organização para declaração
6. **Educação financeira** — ensinar conceitos de forma simples quando o usuário tiver dúvidas
7. **Análise de documentos** — faturas, extratos, contracheques, propostas de crédito
8. **Registro e controle** — registrar transações mencionadas pelo usuário

## Como orientar:
- Sempre contextualize seus conselhos com a situação real do usuário (dados financeiros disponíveis)
- Dê recomendações específicas com números e prazos quando possível
- Explique o "porquê" por trás de cada sugestão
- Quando o usuário perguntar sobre investimentos, pergunte sobre perfil de risco, horizonte temporal e objetivos antes de sugerir
- Proponha metas SMART (Específicas, Mensuráveis, Atingíveis, Relevantes, com Prazo)
- Se perceber problemas financeiros graves (gastos > renda, endividamento), alerte de forma respeitosa mas direta

## Regras de formatação:
- Sempre responda em português brasileiro
- Use **negrito** para valores importantes e destaques
- Use listas numeradas e com bullets para organizar informações
- Use --- para separar seções quando a resposta for longa
- Use emojis com moderação para tornar a leitura agradável (📊 💡 🎯 💰 📝 ⚠️)
- Formate valores monetários sempre como R$ X.XXX,XX
- Quando analisar documentos, faça um resumo estruturado com totais e insights
- Sempre finalize com uma dica, plano de ação ou próximo passo

## Ao analisar documentos (PDF, imagens de faturas/extratos):
- Extraia os valores e categorize cada lançamento
- Apresente um resumo com totais
- Compare com a renda do usuário se disponível
- Dê uma análise com percentual do salário comprometido
- Identifique gastos recorrentes que poderiam ser otimizados
- Sugira melhorias concretas

## Registro de transações:
Se o usuário mencionar uma transação (gasto ou receita), extraia e responda com:
[TRANSACTION]
{"type":"income|expense","category":"categoria","description":"desc","amount":valor}
[/TRANSACTION]

Categorias para despesas: food, transport, housing, health, education, entertainment, shopping, bills, other
Categorias para receitas: salary, freelance, investment, other

Inclua esse bloco APENAS quando detectar claramente uma transação. Pode incluir múltiplos blocos se houver várias transações.

## Exclusão de transações:
Se o usuário pedir para EXCLUIR ou REMOVER uma transação:
[DELETE_TRANSACTION]
{"description":"termo de busca para encontrar a transação"}
[/DELETE_TRANSACTION]

## Tom e postura:
- Seja um consultor confiável — profissional mas acessível
- Nunca julgue os gastos do usuário, mas seja honesto sobre riscos
- Use analogias e exemplos práticos para explicar conceitos
- Celebre conquistas financeiras do usuário (economizou mais, pagou dívida, etc.)
- Se o usuário perguntar algo fora de finanças, redirecione educadamente
- Quando não tiver dados suficientes, pergunte antes de assumir`

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
    : validProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-5.1'

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
      // Passa últimas 5 mensagens para contexto no modo demo
      const recentHistory = messages.slice(-5).map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n')
      return NextResponse.json({ message: generateDemo(lastMsg, financialContext, recentHistory) })
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
        { error: 'A IA demorou para responder. Tente novamente.' },
        { status: 504 },
      )
    }

    const msg = error instanceof Error ? error.message : ''

    // Rate limit do Gemini
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
      return NextResponse.json(
        { error: 'Você atingiu o limite de requisições gratuitas do Gemini. Aguarde alguns segundos e tente novamente.' },
        { status: 429 },
      )
    }

    // Chave inválida
    if (msg.includes('401') || msg.includes('API_KEY_INVALID') || msg.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Chave de API inválida. Verifique nas Configurações.' },
        { status: 401 },
      )
    }

    // Modelo não encontrado
    if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
      return NextResponse.json(
        { error: 'Modelo de IA não disponível. Troque o modelo nas Configurações.' },
        { status: 404 },
      )
    }

    // Arquivo muito grande ou não suportado
    if (msg.includes('payload') || msg.includes('too large') || msg.includes('INVALID_ARGUMENT')) {
      return NextResponse.json(
        { error: 'Arquivo não suportado ou muito grande. Tente um arquivo menor (máx 10MB) ou outro formato.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro inesperado. Tente novamente.' },
      { status: 500 },
    )
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await Promise.race([
    chat.sendMessage(parts as any),
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
function generateDemo(msg: string, ctx: string, history: string): string {
  const lower = msg.toLowerCase()

  // Se a mensagem parece ser resposta a uma pergunta anterior do assistente
  // (ex: "30 reais" depois de "Pode me dizer o valor?")
  if (history.includes('valor exato') || history.includes('Pode me dizer o valor')) {
    const amount = extractAmount(msg)
    if (amount) {
      // Tenta detectar a categoria da mensagem anterior no histórico
      const cat = detectExpenseCategory(history.toLowerCase())
      const prevDesc = history.match(/Usuário: (.+)/)?.[1] || msg
      return `Registrei essa despesa para você! 📝\n\n[TRANSACTION]\n{"type":"expense","category":"${cat}","description":"${prevDesc.slice(0, 60)}","amount":${amount}}\n[/TRANSACTION]\n\n💡 Dica: Acompanhe seus gastos regularmente.`
    }
  }

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
    return `💡 **Dicas do Lucrécio:**\n\n1. **Regra 50/30/20:** 50% necessidades, 30% desejos, 20% poupança\n2. **Registre tudo:** Consciência é o primeiro passo\n3. **Fundo de emergência:** 3 a 6 meses de despesas\n4. **Evite parcelamentos:** Se não pode à vista, repense\n5. **Invista cedo:** Mesmo R$ 100/mês faz diferença\n\nPosso ajudar com algo específico?`
  }

  if (lower.includes('oi') || lower.includes('olá') || lower.includes('ola') || lower === '') {
    return `Olá! 👋 Sou o **Lucrécio**, seu consultor financeiro pessoal.\n\nPosso te ajudar a:\n📝 Registrar gastos e receitas\n📊 Analisar suas finanças\n💡 Dar dicas personalizadas\n🎯 Acompanhar seus objetivos\n\nÉ só me contar sobre suas finanças!`
  }

  return `Posso te ajudar com:\n\n• **Registrar transações** - me diga seus gastos e receitas\n• **Análise financeira** - peça um resumo\n• **Dicas** - pergunte sobre economia e investimentos\n\nÉ só falar! 😊`
}

function extractAmount(text: string): number | null {
  const patterns = [
    /R\$\s*([\d.,]+)/i,
    /(\d+[.,]\d{2})/,
    /(\d+)\s*(reais|real)/i,
    /(\d+)\s*mil/i,
    /(\d+)\s*(conto|pila)/i,
    /\b(\d+)\b/,  // qualquer número isolado como fallback
  ]
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
