'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'

function ThankYouContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('id')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
            <h1 className="text-3xl font-bold text-gradient-purple">DMRT Postal Service</h1>
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <CheckCircle2 className="h-20 w-20 text-green-500" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Post Submitted Successfully!</h2>
          <p className="text-lg text-green-600 font-medium">
            Your post has been submitted and is now awaiting PRO review.
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-black mt-1">•</span>
              <span>The PRO will review your post</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-black mt-1">•</span>
              <span>They may edit it before posting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-black mt-1">•</span>
              <span>For sensitive posts, it may be sent to the team leader for approval</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-black mt-1">•</span>
              <span>Once approved, it will be posted to Facebook and Instagram</span>
            </li>
          </ul>
        </div>

        {submissionId && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Submission ID</p>
            <span className="badge badge-purple font-mono text-xs">
              {submissionId}
            </span>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <Link href="/" className="btn btn-primary">
            Submit Another Post
            <ArrowRight className="inline-block ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong className="text-gray-900">Note:</strong> You can no longer edit this submission. 
            If you need to make changes, please contact the PRO or submit a new post.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="card w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
