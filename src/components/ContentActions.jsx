import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useModeration } from '../context/ModerationContext.jsx'
import { REPORT_REASONS, reportContent } from '../lib/moderation.js'

// The ⋯ on anything another member wrote: report it, or block them. Hidden on
// your own content and when signed out, since neither action means anything
// there.

const NOUN = { post: 'post', comment: 'comment', message: 'message', profile: 'profile', club: 'club' }

const Dots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
  </svg>
)

const Option = ({ children, onClick, danger, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition disabled:opacity-40 ${
      danger
        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
    }`}
  >
    {children}
  </button>
)

const ContentActions = ({ kind, targetId, authorId, authorName, allowBlock = true, tone = 'light', className = '' }) => {
  const { user } = useAuth()
  const { isBlocked, block } = useModeration()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('menu') // menu | report | reported | block | blocked
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user || !authorId || authorId === user.id) return null

  const name = authorName || 'this member'
  const canBlock = allowBlock && !isBlocked(authorId)

  const close = () => { setOpen(false); setStep('menu'); setReason(null); setNote(''); setError(''); setBusy(false) }

  const sendReport = async () => {
    setBusy(true); setError('')
    const { error: err } = await reportContent(kind, targetId, reason, note)
    setBusy(false)
    if (err) setError(err); else setStep('reported')
  }

  const confirmBlock = async () => {
    setBusy(true); setError('')
    const { error: err } = await block(authorId, authorName)
    setBusy(false)
    if (err) setError(err); else setStep('blocked')
  }

  const sheet = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] dark:bg-slate-900"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {step === 'menu' && (
          <>
            <p className="px-1 text-sm font-black text-slate-900 dark:text-white">Something wrong?</p>
            <div className="mt-4 space-y-2">
              <Option onClick={() => setStep('report')}>Report this {NOUN[kind]}</Option>
              {canBlock && <Option danger onClick={() => setStep('block')}>Block {name}</Option>}
            </div>
          </>
        )}

        {step === 'report' && (
          <>
            <p className="px-1 text-sm font-black text-slate-900 dark:text-white">Why are you reporting this?</p>
            <p className="mt-1 px-1 text-xs text-slate-500 dark:text-slate-400">{name} won't know it was you.</p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    reason === r.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reason && (
              <textarea
                value={note}
                maxLength={500}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything we should know? (optional)"
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            )}
            <button
              type="button"
              onClick={sendReport}
              disabled={!reason || busy}
              className="mt-3 w-full rounded-full bg-lime py-3.5 text-sm font-black text-deep transition hover:bg-[#D9FF7A] disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </>
        )}

        {step === 'reported' && (
          <>
            <p className="px-1 text-sm font-black text-slate-900 dark:text-white">Thanks for telling us.</p>
            <p className="mt-1 px-1 text-sm text-slate-500 dark:text-slate-400">
              We review every report within 24 hours and remove anything that breaks the rules.
            </p>
            {canBlock && (
              <div className="mt-4">
                <Option danger onClick={() => setStep('block')}>Also block {name}</Option>
              </div>
            )}
          </>
        )}

        {step === 'block' && (
          <>
            <p className="px-1 text-sm font-black text-slate-900 dark:text-white">Block {name}?</p>
            <p className="mt-1 px-1 text-sm text-slate-500 dark:text-slate-400">
              You won't see their posts, comments or messages anywhere in Zero Club. They won't be told.
              You can unblock them from Edit profile.
            </p>
            <div className="mt-4">
              <Option danger onClick={confirmBlock} disabled={busy}>{busy ? 'Blocking…' : `Block ${name}`}</Option>
            </div>
          </>
        )}

        {step === 'blocked' && (
          <>
            <p className="px-1 text-sm font-black text-slate-900 dark:text-white">{name} is blocked.</p>
            <p className="mt-1 px-1 text-sm text-slate-500 dark:text-slate-400">Their posts and messages are hidden from you now.</p>
          </>
        )}

        {error && <p className="mt-3 px-1 text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={close}
          className="mt-3 w-full rounded-full py-3 text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          {step === 'reported' || step === 'blocked' ? 'Done' : 'Cancel'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        aria-label={`Report or block ${name}`}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
          tone === 'dark'
            ? 'text-slate-500 hover:bg-white/10 hover:text-white'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        } ${className}`}
      >
        <Dots />
      </button>
      {open && createPortal(sheet, document.body)}
    </>
  )
}

export default ContentActions
