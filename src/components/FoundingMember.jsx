import { useAuth } from '../context/AuthContext.jsx'

// No checkout, by design. Creating $0-forever Stripe subscriptions would be a
// permanent contractual commitment; giving the product away by choice keeps the
// option to introduce pricing later and grandfather early members as a gift.
// Wording is deliberately "free while we build", never "free forever".

const perks = [
  'Everything in Zero Club, unlocked',
  'Unlimited coaching with Miles',
  'Payment logging, streaks & milestones',
  'Progress charts and monthly recaps',
  'Community feed and groups',
]

const FoundingMember = () => {
  const { user } = useAuth()

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-lg dark:bg-emerald-950/40">🌱</span>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">Founding member</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Free while we build</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        You're here early, so everything is on the house — no card, no trial timer, no locked features.
        Zero Club exists to get people out of debt; charging you while you're in it would be a strange way to start.
      </p>

      <ul className="mt-4 space-y-2">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-emerald-500">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
            </svg>
            {perk}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-5 text-slate-400 dark:text-slate-500">
        If we ever add a paid tier, founding members keep what they have.
        {user?.email ? ` Signed in as ${user.email}.` : ''}
      </p>
    </div>
  )
}

export default FoundingMember
