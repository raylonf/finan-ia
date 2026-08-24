'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook que escuta mudanças em tempo real no Supabase
 * e chama o callback para recarregar dados.
 */
export function useRealtimeSync(table: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, onUpdate])
}
