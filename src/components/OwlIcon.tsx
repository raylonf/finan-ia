export function OwlIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Corpo/cabeça */}
      <path d="M12 3C8 3 5 6.5 5 10.5C5 16 7 21 12 21C17 21 19 16 19 10.5C19 6.5 16 3 12 3Z" />
      {/* Orelhas/tufos */}
      <path d="M5 10L3 6" />
      <path d="M19 10L21 6" />
      {/* Olho esquerdo */}
      <circle cx="9.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Olho direito */}
      <circle cx="14.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Bico */}
      <path d="M11 14L12 15.5L13 14" />
      {/* Peito */}
      <path d="M9 17C9 17 10.5 18.5 12 18.5C13.5 18.5 15 17 15 17" />
    </svg>
  )
}
