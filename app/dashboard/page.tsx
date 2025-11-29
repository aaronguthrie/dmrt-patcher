'use client'

import { useState, useEffect } from 'react'
import Logo from '../components/Logo'

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
  feedback: Array<{ id: string }>
  leaderApprovals: Array<{ approved: boolean; comment: string | null }>
}

export default function DashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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
    } catch (err: any) {
      alert(err.message || 'Failed to delete submission')
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
              {loading ? 'Authenticating...' : 'Access Dashboard'}
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
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Transparency Dashboard</h1>
          <button className="button" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input
            type="text"
            className="input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="awaiting_pro">Awaiting PRO</option>
            <option value="awaiting_leader">Awaiting Leader</option>
            <option value="awaiting_pro_to_post">Awaiting PRO to Post</option>
            <option value="posted">Posted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Submitted By</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Original Notes</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>AI Post</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Feedback</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>PRO Edits</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Approval</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Posted</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{sub.submittedByEmail}</td>
                  <td style={{ padding: '0.75rem' }}>{sub.status}</td>
                  <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.notes.substring(0, 100)}
                      {sub.notes.length > 100 && (
                        <button
                          onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          style={{ marginLeft: '0.5rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {expandedId === sub.id ? 'Less' : 'More'}
                        </button>
                      )}
                    </div>
                    {expandedId === sub.id && (
                      <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {sub.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.finalPostText?.substring(0, 100) || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{sub.feedback.length}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.editedByPro ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.leaderApprovals.length > 0
                      ? sub.leaderApprovals[0].approved
                        ? '✓ Approved'
                        : `✗ Rejected${sub.leaderApprovals[0].comment ? `: ${sub.leaderApprovals[0].comment}` : ''}`
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.postedToFacebook || sub.postedToInstagram ? (
                      <div>
                        {sub.postedToFacebook && (
                          <div>
                            <a
                              href={`https://facebook.com/${sub.facebookPostId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb' }}
                            >
                              Facebook
                            </a>
                          </div>
                        )}
                        {sub.postedToInstagram && (
                          <div>
                            <a
                              href={`https://instagram.com/p/${sub.instagramPostId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb' }}
                            >
                              Instagram
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      'No'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {deleteConfirmId === sub.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>Confirm?</span>
                        <button
                          onClick={() => deleteSubmission(sub.id)}
                          disabled={deletingId === sub.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: deletingId === sub.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === sub.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === sub.id ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deletingId === sub.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: deletingId === sub.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(sub.id)}
                        disabled={deletingId !== null}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                          opacity: deletingId !== null ? 0.5 : 1,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

