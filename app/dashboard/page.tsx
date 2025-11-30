'use client'

import { useState, useEffect } from 'react'
import { Loader2, Download, Lock } from 'lucide-react'
import Logo from '../components/Logo'
import ContentModal from '../components/ContentModal'

interface Submission {
  id: string
  notes: string
  photoPaths: string[]
  status: string
  finalPostText: string | null
  editedByPro: string | null
  createdAt: string
  submittedByEmail: string
  postedToFacebook: boolean
  postedToInstagram: boolean
  facebookPostId: string | null
  instagramPostId: string | null
  postedAt: string | null
  feedback: Array<{
    id: string
    feedbackText: string
    versionNumber: number
    createdAt: string
  }>
  leaderApprovals: Array<{ approved: boolean; comment: string | null }>
}

export default function DashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; content: string | null }>({ isOpen: false, content: null })
  const [aiPostModal, setAiPostModal] = useState<{ isOpen: boolean; content: string | null }>({ isOpen: false, content: null })
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; entries: Submission['feedback'] }>({ isOpen: false, entries: [] })

  useEffect(() => {
    if (authenticated) {
      loadSubmissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, search, statusFilter])

  const authenticate = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/dashboard/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok || !data.authenticated) {
        throw new Error('Invalid password')
      }

      setAuthenticated(true)
      setPassword('') // Clear the input field
      // Password no longer needed - session is now created server-side
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async () => {
    setLoadingSubmissions(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/dashboard/submissions?${params}`, {
        credentials: 'include', // Include cookies for session authentication
      })
      const data = await response.json()

      if (response.ok) {
        setSubmissions(data.submissions)
      } else if (response.status === 401) {
        // Session expired, require re-authentication
        setAuthenticated(false)
        setError('Session expired. Please log in again.')
      }
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError('Failed to load submissions')
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const exportCSV = async () => {
    try {
      const response = await fetch('/api/dashboard/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dmrt-submissions.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting CSV:', err)
    }
  }

  const deleteSubmission = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/dashboard/submissions/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for session authentication
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete submission')
      }

      // Remove from local state
      setSubmissions(submissions.filter(sub => sub.id !== id))
      setDeleteConfirmId(null)
      setSuccess('Submission deleted successfully')
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to delete submission')
      setSuccess('')
    } finally {
      setDeletingId(null)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <Logo className="mb-4" size={200} />
            <p className="text-gray-700 text-base font-medium">From rough notes → ready to post</p>
            <p className="text-gray-600 mt-3">Transparency Dashboard</p>
          </div>
          <div className="card">
          <p className="text-gray-600 mb-4 text-center text-sm">
            Enter the dashboard password to continue.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input w-full"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            <button
              className="btn btn-primary w-full"
              onClick={authenticate}
              disabled={loading || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="inline-block mr-2 h-4 w-4" />
                  Access Dashboard
                </>
              )}
            </button>
          </div>
          </div>
          <div className="mt-6 text-center text-xs text-gray-600">
            <p>Patcher is a service from Donegal Mountain Rescue Team</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="card mb-8">
          <div className="text-center mb-6">
            <Logo className="mb-3" size={120} />
            <p className="text-gray-700 text-base font-medium mb-1.5">From rough notes → ready to post</p>
            <p className="text-gray-600 text-base">Transparency Dashboard</p>
            <p className="text-gray-500 mt-1.5 text-sm">View and manage all submissions</p>
          </div>

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

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              className="input flex-1"
              placeholder="Search by notes, post text, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input sm:w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="awaiting_pro">Awaiting PRO</option>
              <option value="awaiting_leader">Awaiting Leader</option>
              <option value="awaiting_pro_to_post">Awaiting PRO to Post</option>
              <option value="posted">Posted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button 
              className="btn btn-primary flex items-center justify-center gap-2"
              onClick={exportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          {loadingSubmissions ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-black/10 animate-ping"></div>
                <div className="relative rounded-full bg-black/5 p-4">
                  <Loader2 className="h-8 w-8 text-black animate-spin" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Loading submissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Original Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">AI Post</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Feedback</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PRO Edits</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Approval</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        No submissions found
                      </td>
                    </tr>
                  ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{sub.submittedByEmail}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        <button
                          onClick={() => setNotesModal({ isOpen: true, content: sub.notes })}
                          className="text-blue-600 hover:text-blue-800 underline text-left w-full truncate block"
                          title="Click to view full notes"
                        >
                          {sub.notes.substring(0, 100)}
                          {sub.notes.length > 100 && '...'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        {sub.finalPostText ? (
                          <button
                            onClick={() => setAiPostModal({ isOpen: true, content: sub.finalPostText })}
                            className="text-blue-600 hover:text-blue-800 underline text-left w-full truncate block"
                            title="Click to view full AI post"
                          >
                            {sub.finalPostText.substring(0, 100)}
                            {sub.finalPostText.length > 100 && '...'}
                          </button>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sub.feedback.length > 0 ? (
                          <button
                            onClick={() => setFeedbackModal({ isOpen: true, entries: sub.feedback })}
                            className="text-blue-600 hover:text-blue-800 underline"
                            title="Click to view all feedback"
                          >
                            {sub.feedback.length} {sub.feedback.length === 1 ? 'entry' : 'entries'}
                          </button>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {sub.editedByPro ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sub.leaderApprovals.length > 0 ? (
                          sub.leaderApprovals[0].approved ? (
                            <span className="text-green-600 font-medium">✓ Approved</span>
                          ) : (
                            <span className="text-red-600">
                              ✗ Rejected{sub.leaderApprovals[0].comment ? `: ${sub.leaderApprovals[0].comment}` : ''}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm sticky right-0 bg-white z-5 min-w-[120px]">
                        {deleteConfirmId === sub.id ? (
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-xs text-red-600 font-medium">Confirm?</span>
                            <button
                              onClick={() => deleteSubmission(sub.id)}
                              disabled={deletingId === sub.id}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {deletingId === sub.id ? (
                                <>
                                  <Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                'Yes'
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={deletingId === sub.id}
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(sub.id)}
                            disabled={deletingId !== null}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Patcher is a service from Donegal Mountain Rescue Team</p>
        </div>
      </div>

      {/* Modals */}
      <ContentModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal({ isOpen: false, content: null })}
        title="Original Notes"
        content={notesModal.content}
        type="notes"
      />
      
      <ContentModal
        isOpen={aiPostModal.isOpen}
        onClose={() => setAiPostModal({ isOpen: false, content: null })}
        title="AI Generated Post"
        content={aiPostModal.content}
        type="ai-post"
      />
      
      <ContentModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, entries: [] })}
        title="Feedback History"
        content={null}
        type="feedback"
        feedbackEntries={feedbackModal.entries}
      />
    </div>
  )
}

