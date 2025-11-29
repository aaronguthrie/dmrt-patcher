'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react'
import Logo from '../../components/Logo'
import AuthLoadingScreen from '../../components/AuthLoadingScreen'

function ApprovePageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const submissionId = params.id as string

  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submission, setSubmission] = useState<any>(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setIsAuthenticating(true)
      validateCode(code)
    } else {
      setError('No authorization code provided')
      setLoading(false)
      setIsAuthenticating(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (authenticated && submissionId) {
      loadSubmission()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, submissionId])

  const validateCode = async (code: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, role: 'leader' }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error('Invalid or expired code')
      }

      setAuthenticated(true)
      setIsAuthenticating(false)
      // Clear the code from URL for cleaner UX
      window.history.replaceState({}, '', window.location.pathname)
    } catch (err: any) {
      setError('Link expired or invalid')
      setIsAuthenticating(false)
    } finally {
      setLoading(false)
    }
  }

  const loadSubmission = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load submission')
      }

      setSubmission(data.submission)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve')
      }

      setActionType('approved')
      setCompleted(true)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionComment.trim()) {
      setError('Please provide a rejection comment')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, comment: rejectionComment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject')
      }

      setActionType('rejected')
      setCompleted(true)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Show dedicated authentication loading screen when authenticating
  if (isAuthenticating) {
    return <AuthLoadingScreen error={error} />
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <Logo className="mb-4" size={200} />
            <p className="text-gray-700 text-base font-medium">From rough notes → ready to post</p>
            <p className="text-gray-600 mt-3">Team Leader Approval</p>
          </div>
          <div className="card">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 mb-4">
              {error || 'Link expired or invalid'}
            </div>
          )}
          </div>
          <div className="mt-6 text-center text-xs text-gray-600">
            <p>Patcher is a service from Donegal Mountain Rescue Team</p>
          </div>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <Logo className="mb-4" size={200} />
          </div>
          <div className="card text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
            <p className="text-gray-600">Loading submission...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show confirmation page after approval/rejection
  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <Logo className="mb-4" size={200} />
          </div>
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                {actionType === 'approved' ? (
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500" />
                )}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {actionType === 'approved' ? 'Post Approved!' : 'Post Rejected'}
            </h2>
            <p className="text-base text-gray-600 font-medium">
              PRO will be notified.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const postText = submission.editedByPro || submission.finalPostText

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <Logo className="mb-3" size={120} />
          <p className="text-gray-700 text-base font-medium mb-1.5">From rough notes → ready to post</p>
          <p className="text-gray-600 text-base">Team Leader Approval</p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Review Post for Approval</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <span className="text-sm font-medium text-gray-500">Submitted by</span>
                <p className="text-gray-900 font-medium">{submission.submittedByEmail}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Date</span>
                <p className="text-gray-900 font-medium">{new Date(submission.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Text</label>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-medium text-gray-900">
                {postText}
              </pre>
            </div>
          </div>

          {submission.photoPaths.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
              <div className="photo-grid">
                {submission.photoPaths.map((path: string, index: number) => (
                  <div key={index} className="photo-item">
                    <img src={path} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 mb-4">
              {success}
            </div>
          )}

          {!showRejectForm ? (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                className="btn btn-primary flex-1"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="inline-block mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                className="btn btn-danger flex-1"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
              >
                <XCircle className="inline-block mr-2 h-4 w-4" />
                Reject
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Comment
              </label>
              <textarea
                className="textarea min-h-[120px]"
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Explain why this post is being rejected..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  className="btn btn-danger flex-1"
                  onClick={handleReject}
                  disabled={loading || !rejectionComment.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="inline-block mr-2 h-4 w-4" />
                      Confirm Rejection
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionComment('')
                  }}
                  disabled={loading}
                >
                  <X className="inline-block mr-2 h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <ApprovePageContent />
    </Suspense>
  )
}
