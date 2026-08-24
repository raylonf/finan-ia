'use client'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = renderMarkdown(content)

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text)

  // Linhas horizontais ---
  html = html.replace(/^---$/gm, '<hr class="my-3 border-gray-200" />')

  // Headers (## e ###)
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold mt-3 mb-1">$1</h3>')

  // Bold **texto**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic *texto*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Listas com - ou •
  html = html.replace(/^[-•] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  // Agrupar <li> consecutivos em <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>')

  // Listas numeradas (1. texto)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
  html = html.replace(/((?:<li class="ml-4 list-decimal">.*?<\/li>\n?)+)/g, '<ol class="my-2 space-y-1">$1</ol>')

  // Links [texto](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-brand-600 underline">$1</a>')

  // Code inline `texto`
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  // Limpar <br /> extras dentro de listas
  html = html.replace(/<\/li><br \/>/g, '</li>')
  html = html.replace(/<br \/><ul/g, '<ul')
  html = html.replace(/<br \/><ol/g, '<ol')
  html = html.replace(/<\/ul><br \/>/g, '</ul>')
  html = html.replace(/<\/ol><br \/>/g, '</ol>')
  html = html.replace(/<br \/><hr/g, '<hr')
  html = html.replace(/<hr([^>]*) \/><br \/>/g, '<hr$1 />')

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
