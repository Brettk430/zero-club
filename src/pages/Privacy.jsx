const Section = ({ title, children }) => (
  <div className="mt-8">
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </div>
)

const Privacy = () => (
  <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Privacy</h1>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated 6 August 2026</p>

    <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Zero Club handles something personal: what you owe. This page says plainly what we collect,
      where it goes, and how to get rid of it. No lawyer-speak.
    </p>

    <Section title="What we collect">
      <p><strong className="text-slate-900 dark:text-white">Your email address</strong>, so you can sign in and we can send the reminders you opt into.</p>
      <p><strong className="text-slate-900 dark:text-white">The plan you enter</strong> — debt names, balances, interest rates, minimum payments, income, savings goals and the payments you log. You type all of it; we never connect to your bank and we never see your account numbers or credentials.</p>
      <p><strong className="text-slate-900 dark:text-white">Optional profile details</strong> — a display name, a community handle and a birthday, if you choose to add them.</p>
      <p><strong className="text-slate-900 dark:text-white">Anonymous usage analytics</strong>, so we know which parts of the app help and which don't.</p>
    </Section>

    <Section title="What the community can see">
      <p>
        When you log a payment or hit a milestone, a post appears in the community feed showing your
        <strong className="text-slate-900 dark:text-white"> handle</strong>, the <strong className="text-slate-900 dark:text-white">amount</strong> and the <strong className="text-slate-900 dark:text-white">debt's nickname</strong>.
      </p>
      <p>
        Your balances, income, payoff date and email are never posted. The feed is handle-first on purpose —
        you're <em>SteadyFalcon42</em> unless you deliberately change your handle to your real name in Profile.
      </p>
    </Section>

    <Section title="Where it goes">
      <p>Your account and community posts live in <strong className="text-slate-900 dark:text-white">Supabase</strong>, our database provider. The app is hosted on <strong className="text-slate-900 dark:text-white">Vercel</strong>.</p>
      <p>
        When you talk to Miles, your question and a summary of your plan are sent to <strong className="text-slate-900 dark:text-white">Anthropic</strong> to generate the reply.
        Anthropic does not train its models on that data. If you'd rather nothing be sent, simply don't use the coach.
      </p>
      <p>Reminder emails, when enabled, are delivered through <strong className="text-slate-900 dark:text-white">Resend</strong>.</p>
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
        Profile → <strong className="text-slate-900 dark:text-white">Delete my account</strong> permanently removes your account, plan, payment
        history, savings goals, community posts and comments. It's immediate and irreversible — there's no soft
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
