import { Link } from 'react-router-dom'

const Section = ({ title, children }) => (
  <div className="mt-8">
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </div>
)

const B = ({ children }) => <strong className="text-slate-900 dark:text-white">{children}</strong>

const Terms = () => (
  <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Terms</h1>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated 18 September 2026</p>

    <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
      These are the rules for using Zero Club. By creating an account or using the app, you agree to them.
      They're written plainly on purpose.
    </p>

    <Section title="What Zero Club is">
      <p>
        A place to track one number down to zero, alongside people doing the same. Zero Club is not a bank, a lender
        or a financial adviser, and <B>nothing in it is financial, legal or tax advice</B>. Your plan is your call.
      </p>
    </Section>

    <Section title="Your account">
      <p>You need to be at least 13. Keep your sign-in to yourself — you're responsible for what happens on your account. One person per account.</p>
    </Section>

    <Section title="Community rules">
      <p>
        Zero Club only works if it's a safe place to talk about money. <B>We have zero tolerance for objectionable
        content and abusive members.</B> Don't post, send, or use as your handle, display name or a club name,
        anything that:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>harasses, bullies, threatens or intimidates anyone</li>
        <li>attacks anyone for their race, ethnicity, religion, gender, sexual orientation, disability or any other part of who they are</li>
        <li>is sexually explicit</li>
        <li>encourages self-harm or suicide</li>
        <li>is spam, a scam or a sales pitch — including debt-relief services, loans and referral links</li>
        <li>shares someone else's private information</li>
        <li>pretends to be someone else</li>
        <li>is illegal</li>
      </ul>
      <p>
        Content that breaks these rules is removed, and the account behind it can be suspended or permanently deleted,
        without warning.
      </p>
    </Section>

    <Section title="Reporting and blocking">
      <p>
        Tap <B>⋯</B> on any post, comment, message, profile or club to report it. <B>We review every report within
        24 hours</B> and remove anything that breaks these rules.
      </p>
      <p>
        The same menu lets you <B>block</B> someone. You won't see their posts, comments or messages anywhere in
        Zero Club, and they aren't told. You can unblock people from Edit profile.
      </p>
      <p>Zero Club also refuses some language outright, before it's ever posted.</p>
    </Section>

    <Section title="What you post">
      <p>
        What you post is yours. By posting it, you let Zero Club show it to the people it's meant for — your club,
        or the feed — for as long as it's up. You're responsible for what you post.
      </p>
      <p>The numbers you enter are yours to keep accurate. We don't check them.</p>
    </Section>

    <Section title="Ending things">
      <p>
        You can delete your account any time from Profile → <B>Delete my account</B>. It removes everything,
        immediately — see <Link to="/privacy" className="underline underline-offset-4">Privacy</Link>. We can suspend
        or close accounts that break these terms.
      </p>
    </Section>

    <Section title="The fine print">
      <p>
        Zero Club is provided as it is. We work hard to keep it running and your data safe, but we can't promise it
        will always be available or free of errors. As far as the law allows, Zero Club isn't responsible for indirect
        losses, or for decisions you make about your money.
      </p>
    </Section>

    <Section title="Changes">
      <p>
        If these terms change, the date at the top changes too, and anything significant is flagged in the app.
        Using Zero Club after a change means you accept the new version.
      </p>
    </Section>

    <Section title="Contact">
      <p>
        Questions, or something to report that the app can't reach? Email{' '}
        <a href="mailto:brettkreider11@gmail.com" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 dark:text-white dark:decoration-slate-600">
          brettkreider11@gmail.com
        </a>.
      </p>
    </Section>
  </section>
)

export default Terms
