export default function Logo({ className = '', size = 120 }: { className?: string; size?: number }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Patcher Logo"
        className="object-contain"
        style={{ maxWidth: `${size}px`, height: 'auto' }}
      />
    </div>
  )
}

