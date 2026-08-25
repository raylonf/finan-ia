/* eslint-disable @next/next/no-img-element */

export function OwlIcon({ className = 'w-5 h-5', invert = false }: { className?: string; invert?: boolean }) {
  return (
    <img
      src="/owl-logo.png"
      alt="Finan IA"
      className={`${className} object-contain ${invert ? 'invert' : ''}`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}
