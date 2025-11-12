'use client'

import { X, FileText } from 'lucide-react'
import { SYSTEM_PROMPT } from '@/lib/gemini'

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PromptModal({ isOpen, onClose }: PromptModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-purple-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <h2 className="text-2xl font-bold">AI System Prompt</h2>
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
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-mono bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
                {SYSTEM_PROMPT}
              </pre>
            </div>
            
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong className="text-purple-700">Note:</strong> This prompt is used as the system instruction for the AI model. 
                Your notes are sent as the user prompt, and the AI generates the post based on these guidelines.
              </p>
            </div>
          </div>
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

