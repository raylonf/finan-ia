export function OwlIcon({ className = 'w-5 h-5', color = '#000000' }: { className?: string; color?: string }) {
  return (
    <div
      className={`${className}`}
      style={{
        backgroundColor: color,
        WebkitMaskImage: 'url(/owl-logo.png)',
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: 'url(/owl-logo.png)',
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  )
}
