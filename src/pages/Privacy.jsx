const Section = ({ title, children }) => (
  <div className="mt-8">
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </div>
)

const Privacy = () => (
  <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Privacy</h1>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated 16 September 2026</p>

    <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Zero Club handles something personal: what you owe. This page says plainly what we collect,
      where it goes, and how to get rid of it. No lawyer-speak.
    </p>

    <Section title="What we collect">
      <p><strong className="text-slate-900 dark:text-white">Your email address</strong>, so you can sign in and get back into your account if you forget your password.</p>
      <p><strong className="text-slate-900 dark:text-white">The number you're paying off</strong> — one total, an optional target date, and the payments you log against it. You type all of it; we never connect to your bank and we never see your account numbers or credentials.</p>
      <p><strong className="text-slate-900 dark:text-white">Optional profile details</strong> — a display name, a handle and a profile photo, if you choose to add them.</p>
      <p><strong className="text-slate-900 dark:text-white">Reports and blocks</strong> — if you report something, we keep the report, a copy of what you reported and who sent it, so we can act on it. If you block someone, we keep that list so we can hide them from you. The person you report or block is never told.</p>
      <p><strong className="text-slate-900 dark:text-white">Usage analytics</strong>, through PostHog, so we know which parts of the app help and which don't. Once you sign in, that activity is linked to your account, but never to your email address.</p>
    </Section>

    <Section title="What the community can see">
      <p>
        When you log a payment or hit a milestone, a post appears in the community feed showing your
        <strong className="text-slate-900 dark:text-white"> handle</strong> and the <strong className="text-slate-900 dark:text-white">amount</strong>.
      </p>
      <p>
        Your remaining balance and your email are never posted, and clubs compare percentages rather than dollars unless you
        turn that on yourself. The feed is handle-first on purpose —
        you're <em>SteadyFalcon42</em> unless you deliberately change your handle to your real name in Profile.
      </p>
    </Section>

    <Section title="Where it goes">
      <p>Your account and community posts live in <strong className="text-slate-900 dark:text-white">Supabase</strong>, our database provider. The app is hosted on <strong className="text-slate-900 dark:text-white">Vercel</strong>.</p>
      <p>Messages you post in a club's chat are visible to every member of that club.</p>
      <p>We do not sell your data. We do not share it with advertisers or data brokers.</p>
    </Section>

    <Section title="What stays on your device">
      <p>
        Your plan is kept in your browser's local storage so the app works instantly and offline. Signing out
        erases it from that device. Signing back in restores it from your account.
      </p>
    </Section>

    <Section title="Deleting everything">
      <p>
        Profile → <strong className="text-slate-900 dark:text-white">Delete my account</strong> permanently removes your account, your number, payment
        history, club memberships, posts and comments. It's immediate and irreversible — there's no soft
        delete and no recovery window, so please be sure.
      </p>
    </Section>

    <Section title="Children">
      <p>Zero Club isn't intended for anyone under 13, and we don't knowingly collect their information.</p>
    </Section>

    <Section title="Contact">
      <p>
        Questions, or want a copy of what we hold on you? Email{' '}
        <a href="mailto:brettkreider11@gmail.com" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 dark:text-white dark:decoration-slate-600">
          brettkreider11@gmail.com
        </a>.
      </p>
    </Section>
  </section>
)

export default Privacy
