export function OwlIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="currentColor"
      className={className}
    >
      {/* Asa esquerda */}
      <path d="M2 20C2 20 8 8 20 6C26 5 30 8 32 12C28 10 22 9 16 12C10 15 6 20 4 24C3 26 2 22 2 20Z" />
      <path d="M6 24C6 24 10 18 16 15C20 13 24 13 27 14L22 18C18 20 14 23 10 28C8 30 6 26 6 24Z" />
      <path d="M10 30C10 30 14 25 20 22C23 20 26 20 28 21L24 24C20 27 17 30 14 34C12 36 10 32 10 30Z" />
      {/* Corpo/cabeça */}
      <ellipse cx="44" cy="18" rx="12" ry="13" />
      {/* Face interna */}
      <ellipse cx="44" cy="18" rx="8" ry="9" fill="white" />
      {/* Olhos */}
      <path d="M40 16L44 19L42 15Z" fill="currentColor" />
      <path d="M48 16L44 19L46 15Z" fill="currentColor" />
      {/* Bico */}
      <path d="M43 20L44 22L45 20Z" fill="currentColor" />
      {/* Orelhas */}
      <path d="M36 8C36 8 38 4 40 5C42 6 39 9 39 9Z" />
      <path d="M52 8C52 8 50 4 48 5C46 6 49 9 49 9Z" />
      {/* Penas da asa inferior */}
      <path d="M14 34C14 34 18 30 24 27C27 25 30 25 32 26L28 29C24 32 21 34 18 38C16 40 14 36 14 34Z" />
    </svg>
  )
}
