'use client'

import { useEffect, useState } from 'react'

interface ProtectedEmailProps {
  className?: string
  asLink?: boolean
}

export default function ProtectedEmail({ className = '', asLink = true }: ProtectedEmailProps) {
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Obfuscated email assembly to prevent bot scraping
    // Parts are encoded and decoded at runtime
    const decode = (str: string) => {
      // Simple character code shift (decode by -1)
      return str.split('').map(char => String.fromCharCode(char.charCodeAt(0) - 1)).join('')
    }
    
    // Encoded parts (shifted by +1 from original)
    const part1 = decode('qsp')  // 'pro'
    const part2 = decode('A')     // '@'
    const part3 = decode('epofhbmsu')  // 'donegalmrt'
    const part4 = decode('/')     // '.'
    const part5 = decode('jf')    // 'ie'
    
    setEmail([part1, part2, part3, part4, part5].join(''))
  }, [])

  if (!email) {
    // Show placeholder that doesn't reveal the email
    return <span className={className}>[email protected]</span>
  }

  if (asLink) {
    return (
      <a 
        href={`mailto:${email}`}
        className={`hover:text-gray-900 underline ${className}`}
        onClick={(e) => {
          // Additional protection: verify it's a real user interaction
          if (e.detail === 0) {
            e.preventDefault()
            return false
          }
        }}
        onMouseDown={(e) => {
          // Only allow left mouse button
          if (e.button !== 0) {
            e.preventDefault()
          }
        }}
      >
        {email}
      </a>
    )
  }

  return <span className={className}>{email}</span>
}

