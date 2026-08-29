import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Exclui do middleware:
     * - _next/static, _next/image (assets do Next)
     * - favicon, api
     * - arquivos de imagem/mídia (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|mp4|webm|woff|woff2|ttf)$).*)',
  ],
}
