'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '@/app/ui/toast'

const CATEGORIES = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'idea', label: 'Idea / feature request' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
]

export default function FeedbackDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState('idea')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const { showToast } = useToast()

  const close = () => {
    if (sending) return
    setIsOpen(false)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, page: pathname }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || 'Could not send your message. Please try again.')
        return
      }

      showToast('success', 'Thanks for the feedback!', 'We read every message.')
      setMessage('')
      setCategory('idea')
      setIsOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="dash-nav-footer-btn"
      >
        <ChatBubbleLeftEllipsisIcon className="w-5 flex-none" aria-hidden="true" />
        <span className="hidden md:block">Feedback</span>
      </button>

      <Dialog open={isOpen} onClose={close} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel
            className="w-full max-w-md rounded-xl border p-6"
            style={{
              background: '#0d0d0d',
              borderColor: '#1a1a1a',
              color: 'var(--dash-text)',
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold dash-text-primary">
                  Send feedback
                </DialogTitle>
                <p className="mt-1 text-sm dash-text-muted">
                  Bugs, ideas, complaints — it all lands in our inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="dash-btn-ghost h-8 w-8 flex-none !p-0"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="feedback-category"
                  className="mb-1 block text-sm dash-text-secondary"
                >
                  Type
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="dash-input"
                  disabled={sending}
                >
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="feedback-message"
                  className="mb-1 block text-sm dash-text-secondary"
                >
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="dash-input"
                  rows={5}
                  maxLength={4000}
                  required
                  minLength={5}
                  disabled={sending}
                  placeholder="What happened, or what would make Momentreel better for you?"
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#f87171' }} role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="dash-btn-ghost h-10 px-4 text-sm"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-btn-gradient h-10 px-4 text-sm"
                  disabled={sending || message.trim().length < 5}
                >
                  {sending ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
