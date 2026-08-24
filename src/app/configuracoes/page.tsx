'use client'

import { useState, useEffect } from 'react'
import { Settings, Key, Cpu, CheckCircle, Eye, EyeOff, AlertTriangle, Zap, Download, Upload, Database } from 'lucide-react'
import { exportAllData, importData } from '@/lib/storage'

import { getUserSettings, saveUserSettings } from '@/lib/data'

type Provider = 'gemini' | 'openai'

const PROVIDERS = [
  { id: 'gemini' as Provider, name: 'Google Gemini', description: 'Grátis! 15 req/min no tier free', badge: 'Grátis' },
  { id: 'openai' as Provider, name: 'OpenAI', description: 'Pago. Mais modelos disponíveis', badge: 'Pago' },
]

const MODELS: Record<Provider, { id: string; name: string; description: string }[]> = {
  gemini: [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Mais recente, rápido e gratuito' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Rápido, ótimo para uso diário' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Mais avançado, coding e agentes' },
  ],
  openai: [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Rápido e econômico, 1M tokens de contexto' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Potente, ótimo para análise financeira' },
    { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', description: 'Mais avançado e inteligente' },
  ],
}

const STORAGE_KEY_API = 'finan_ia_api_key'
const STORAGE_KEY_MODEL = 'finan_ia_model'
const STORAGE_KEY_PROVIDER = 'finan_ia_provider'

export default function ConfiguracoesPage() {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-3.6-flash')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')

  useEffect(() => {
    getUserSettings().then((settings) => {
      setProvider((settings.ai_provider || 'gemini') as Provider)
      setApiKey(settings.api_key || '')
      setModel(settings.ai_model || 'gemini-3.6-flash')
    })
  }, [])

  function handleProviderChange(p: Provider) {
    setProvider(p)
    setModel(MODELS[p][0].id)
    setTestResult(null)
    setTestError('')
  }

  async function handleSave() {
    await saveUserSettings({
      api_key: apiKey.trim(),
      ai_model: model,
      ai_provider: provider,
    })
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTest() {
    if (!apiKey.trim()) {
      setTestResult('error')
      setTestError('Informe a chave de API.')
      return
    }

    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model, provider }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult('success')
      } else {
        setTestResult('error')
        setTestError(data.error || 'Chave inválida.')
      }
    } catch {
      setTestResult('error')
      setTestError('Erro de conexão.')
    } finally {
      setTesting(false)
    }
  }

  function handleClear() {
    setApiKey('')
    saveUserSettings({ api_key: '' })
    setTestResult(null)
    setTestError('')
  }

  const currentModels = MODELS[provider]

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="ml-10 md:ml-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            Configurações
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure a inteligência artificial do Lucrécio</p>
        </div>

        {/* Provider */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-gray-800">Provedor de IA</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  provider === p.id
                    ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-gray-800">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.badge === 'Grátis' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-gray-800">
              Chave da API ({provider === 'gemini' ? 'Google' : 'OpenAI'})
            </h3>
          </div>

          <p className="text-sm text-gray-500">
            {provider === 'gemini'
              ? 'Obtenha sua chave grátis em aistudio.google.com. O Gemini tem um tier gratuito generoso.'
              : 'Insira sua chave de API da OpenAI (começa com sk-).'}
          </p>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              className="input-field pr-10 font-mono text-sm"
              aria-label="Chave de API"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {testResult === 'success' && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Conexão OK! A IA está pronta para uso.
            </div>
          )}

          {testResult === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              {testError || 'Chave inválida ou erro de conexão.'}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleTest} disabled={testing || !apiKey.trim()} className="btn-secondary text-sm">
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
            {apiKey && (
              <button onClick={handleClear} className="btn-danger text-sm">
                Limpar chave
              </button>
            )}
          </div>

          {/* Link para obter chave */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              {provider === 'gemini' ? (
                <>
                  🔑 Obtenha sua chave gratuita em{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    aistudio.google.com/apikey
                  </a>
                  {' '}— basta ter uma conta Google.
                </>
              ) : (
                <>
                  🔑 Obtenha sua chave em{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    platform.openai.com
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Modelo */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-gray-800">Modelo</h3>
          </div>

          <div className="space-y-2">
            {currentModels.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  model === m.id
                    ? 'border-brand-300 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={model === m.id}
                  onChange={(e) => setModel(e.target.value)}
                  className="accent-brand-600"
                />
                <div>
                  <p className="font-medium text-sm text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Salvar */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary">
            Salvar configurações
          </button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              Salvo!
            </span>
          )}
        </div>

        {/* Segurança */}
        <div className="card p-5 bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            🔒 Sua chave fica apenas no navegador (localStorage). Ela é enviada para a API do provedor escolhido
            durante o processamento das mensagens e nunca é armazenada em servidor externo.
          </p>
        </div>

        {/* Backup de Dados */}
        <BackupSection />
      </div>
    </div>
  )
}

function BackupSection() {
  const [importResult, setImportResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function handleExport() {
    const data = exportAllData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finan-ia-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = importData(content)

      if (result.success) {
        setImportResult({ type: 'success', msg: 'Dados importados com sucesso! Recarregue a página para ver as alterações.' })
      } else {
        setImportResult({ type: 'error', msg: result.error || 'Erro ao importar' })
      }
    }
    reader.onerror = () => {
      setImportResult({ type: 'error', msg: 'Erro ao ler o arquivo' })
    }
    reader.readAsText(file)

    // Reset input para permitir reimportar o mesmo arquivo
    e.target.value = ''
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-brand-600" />
        <h3 className="font-semibold text-gray-800">Backup de Dados</h3>
      </div>

      <p className="text-sm text-gray-500">
        Seus dados ficam apenas neste navegador. Faça backup regularmente para não perder nada.
      </p>

      <div className="flex gap-3">
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Exportar dados
        </button>

        <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
          <Upload className="w-4 h-4" />
          Importar backup
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          importResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {importResult.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {importResult.msg}
        </div>
      )}

      <p className="text-xs text-gray-400">
        O arquivo exportado contém todas as transações e mensagens do chat em formato JSON.
      </p>
    </div>
  )
}
