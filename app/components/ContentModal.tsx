'use client'

import { X, FileText, MessageSquare, Sparkles } from 'lucide-react'

interface ContentModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string | null
  type?: 'notes' | 'ai-post' | 'feedback'
  feedbackEntries?: Array<{
    id: string
    feedbackText: string
    versionNumber: number
    createdAt: string
  }>
}

export default function ContentModal({ 
  isOpen, 
  onClose, 
  title, 
  content,
  type = 'notes',
  feedbackEntries = []
}: ContentModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'ai-post':
        return <Sparkles className="h-6 w-6" />
      case 'feedback':
        return <MessageSquare className="h-6 w-6" />
      default:
        return <FileText className="h-6 w-6" />
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {type === 'feedback' ? (
            <div className="space-y-4">
              {feedbackEntries.length === 0 ? (
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <p className="text-gray-600 text-center">No feedback recorded yet.</p>
                </div>
              ) : (
                feedbackEntries.map((entry, index) => (
                  <div key={entry.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Version {entry.versionNumber}
                        </span>
                        {index === 0 && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                      {entry.feedbackText}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              {content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {content}
                </div>
              ) : (
                <p className="text-gray-600 text-center">No content available.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <button
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

