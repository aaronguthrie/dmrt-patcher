'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ThankYouContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('id')

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
        <h1 style={{ marginBottom: '1rem' }}>Post Submitted Successfully!</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#16a34a' }}>
          Your post has been submitted and is now awaiting PRO review.
        </p>
        
        <div style={{ 
          background: '#f9fafb', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>What happens next?</strong>
          </p>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>The PRO will review your post</li>
            <li>They may edit it before posting</li>
            <li>For sensitive posts, it may be sent to the team leader for approval</li>
            <li>Once approved, it will be posted to Facebook and Instagram</li>
          </ul>
        </div>

        {submissionId && (
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '2rem' }}>
            Submission ID: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{submissionId}</code>
          </p>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/" className="button">
            Submit Another Post
          </Link>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6b7280' }}>
          <strong>Note:</strong> You can no longer edit this submission. If you need to make changes, 
          please contact the PRO or submit a new post.
        </p>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}

