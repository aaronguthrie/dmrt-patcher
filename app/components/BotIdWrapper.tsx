'use client'

import { BotIdClient } from 'botid/client'

export default function BotIdWrapper() {
  return (
    <BotIdClient protect={[
      { path: '/api/auth/send-link', method: 'POST' },
      { path: '/api/auth/validate', method: 'POST' },
      { path: '/api/auth/password-login', method: 'POST' },
      { path: '/api/submissions/create', method: 'POST' },
      { path: '/api/submissions/list', method: 'GET' },
      { path: '/api/submissions/[id]', method: 'GET' },
      { path: '/api/submissions/[id]', method: 'PATCH' },
      { path: '/api/submissions/regenerate', method: 'POST' },
      { path: '/api/submissions/ready', method: 'POST' },
      { path: '/api/submissions/[id]/approve', method: 'POST' },
      { path: '/api/submissions/[id]/send-for-approval', method: 'POST' },
      { path: '/api/submissions/[id]/post', method: 'POST' },
      { path: '/api/dashboard/submissions', method: 'GET' },
      { path: '/api/dashboard/export', method: 'GET' },
    ]} />
  )
}

