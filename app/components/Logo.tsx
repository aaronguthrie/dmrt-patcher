export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Patcher Logo"
        className="object-contain"
        style={{ maxWidth: '120px', height: 'auto' }}
      />
    </div>
  )
}

