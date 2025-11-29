'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Logo from '../components/Logo'

function ThankYouContent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <Logo className="mb-4" size={200} />
        </div>
        <div className="card text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-3">Post Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Your post is now awaiting PRO review.
          </p>
          <Link href="/" className="btn btn-primary">
            Submit Another Post
            <ArrowRight className="inline-block ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <Logo className="mb-4" size={200} />
          </div>
          <div className="card text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
