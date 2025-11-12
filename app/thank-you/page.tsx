'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function ThankYouContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('id')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-purple-200">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              DMRT Postal Service
            </CardTitle>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle2 className="h-20 w-20 text-green-500" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            </div>
          </div>
          <CardTitle className="text-2xl">Post Submitted Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your post has been submitted and is now awaiting PRO review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-semibold mb-3 text-purple-900">What happens next?</h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>The PRO will review your post</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>They may edit it before posting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>For sensitive posts, it may be sent to the team leader for approval</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Once approved, it will be posted to Facebook and Instagram</span>
              </li>
            </ul>
          </div>

          {submissionId && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Submission ID</p>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 font-mono text-xs">
                {submissionId}
              </Badge>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              asChild
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Link href="/">
                Submit Another Post
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-purple-200">
            <p className="text-xs text-center text-muted-foreground">
              <strong className="text-foreground">Note:</strong> You can no longer edit this submission. 
              If you need to make changes, please contact the PRO or submit a new post.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
