'use client'

export function LoadingPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  )
}

export function LoadingCards() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 bg-gray-100 rounded-xl" />
      <div className="h-14 bg-gray-100 rounded-xl" />
      <div className="h-14 bg-gray-100 rounded-xl" />
      <div className="h-14 bg-gray-100 rounded-xl" />
    </div>
  )
}

export function LoadingChat() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando mensagens...</p>
      </div>
    </div>
  )
}
