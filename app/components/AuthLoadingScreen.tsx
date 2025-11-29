'use client'

import { Loader2, Shield } from 'lucide-react'
import Logo from './Logo'

interface AuthLoadingScreenProps {
  error?: string
}

export default function AuthLoadingScreen({ error }: AuthLoadingScreenProps) {
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Logo className="mb-4" size={200} />
            <p className="text-gray-700 text-base font-medium mb-2">From rough notes → ready to post</p>
          </div>
          <div className="card">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Failed</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {error || 'The authentication link is invalid or has expired.'}
                </p>
                <p className="text-xs text-gray-500">
                  Please request a new login link to continue.
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-primary w-full"
              >
                Return to Login
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo className="mb-4" size={200} />
          <p className="text-gray-700 text-base font-medium mb-2">From rough notes → ready to post</p>
        </div>
        <div className="card">
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-black/10 animate-ping"></div>
                <div className="relative rounded-full bg-black/5 p-4">
                  <Loader2 className="h-8 w-8 text-black animate-spin" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">Authenticating...</h2>
              <p className="text-sm text-gray-600">
                Verifying your login link. This will only take a moment.
              </p>
            </div>
            <div className="pt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-black rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Patcher is a service from Donegal Mountain Rescue Team</p>
        </div>
      </div>
    </div>
  )
}

