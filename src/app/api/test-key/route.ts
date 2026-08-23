import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, provider } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Chave não informada' })
    }

    if (provider === 'gemini') {
      return await testGemini(apiKey, model)
    } else {
      return await testOpenAI(apiKey, model)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ success: false, error: message })
  }
}

async function testGemini(apiKey: string, model: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const genModel = genAI.getGenerativeModel({ model: model || 'gemini-3.6-flash' })

    const result = await genModel.generateContent('Responda apenas: ok')
    const text = result.response.text()

    if (text) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: 'Sem resposta do Gemini' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao conectar com Gemini'
    return NextResponse.json({ success: false, error: msg })
  }
}

async function testOpenAI(apiKey: string, model: string) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Responda apenas: ok' }],
        max_tokens: 5,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Status ${res.status}`)
    }

    const data = await res.json()
    if (data.choices?.[0]?.message?.content) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: 'Sem resposta' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao conectar com OpenAI'
    return NextResponse.json({ success: false, error: msg })
  }
}
