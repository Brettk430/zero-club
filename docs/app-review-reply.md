# Reply to App Review — Guideline 2.1, Information Needed

Paste this into the App Review message thread in App Store Connect, and into
**App Review Information → Notes** so later submissions already have it.

---

**2. Purpose and target audience**

Zero Club helps people pay off debt by tracking one number — everything they owe,
as a single figure — and doing it alongside other people rather than alone.

The audience is adults with consumer debt: student loans, credit cards, car
loans, medical bills. The problem it solves is motivational, not mathematical.
Payoff calculators and spreadsheets already exist; what people lack is the
accountability to keep going for the years it takes. Zero Club turns each payment
into visible progress, a milestone, and something a small group of people can see
and respond to — closer to a running club than to a budgeting app.

Members type in what they owe. The app never connects to a bank, never sees
account numbers or credentials, and never moves money.

**3. Setting up and accessing the main features**

Demo account (also in App Review Information):
  Email: appreview@joinzeroclub.com
  Password: ZeroClub-Review-2026

This account already has a balance, payment history, badges, and membership in a
club with other members and chat, so every feature is reachable immediately.

  • Log a payment — the green + button in the centre of the tab bar. Enter any
    amount and tap ELIMINATE. The balance drops and a post appears in the feed.
  • Clubs — the Clubs tab. The account is already in "Class of 2027"; open it for
    standings and the Chat tab. "Find a club" lists public clubs to join, and a
    club can be created from the same screen.
  • Feed — the Feed tab, showing payments and milestones from all members, with
    reactions and comments.
  • Report and block — the ⋯ next to any post, comment, chat message or profile
    written by another member. Reporting asks for a reason; blocking hides that
    member and is reversible under Profile → Edit profile → Blocked.
  • Account deletion — Profile (avatar, top right) → Edit profile → Delete my
    account. It is immediate and permanent, with no recovery window.
  • Sign in with Apple, Google, or email and password are all offered.

There are no paid features, no in-app purchases, and no subscriptions. The app is
free and complete as submitted.

**4. External services used**

  • Supabase — hosted authentication and PostgreSQL database (accounts, balances,
    payments, clubs, messages). Supabase is the only store of member data.
  • Vercel — web hosting and two serverless endpoints: account deletion, and
    exchanging the Sign in with Apple authorization code so the app can revoke
    Apple tokens when an account is deleted.
  • Sign in with Apple and Google Sign-In — authentication only.
  • PostHog — product analytics (which screens are used), tied to an account ID.
    No email address, no financial figures, and no advertising or tracking SDKs.
  • Cloudflare — DNS for joinzeroclub.com.

No payment processors, no AI services, no data providers, no bank aggregation,
and no advertising networks are used.

**5. Regional differences**

None. The app behaves identically in every region. There is no region-gated
content, no localisation, and no geographic restriction. The interface is English
and amounts display in US dollars; members in any country can use it to track any
figure they enter.

**6. Regulated industry and third-party material**

Zero Club is not a financial institution or a financial service. It does not lend,
move, hold, or transfer money; it does not connect to banks or payment networks;
it does not provide debt settlement, debt consolidation, credit repair, or credit
reporting; and it gives no financial, legal, or tax advice. The Terms state this
explicitly: https://joinzeroclub.com/terms

Every figure in the app is typed in by the member and is a self-reported note to
themselves. No licence or regulatory authorisation is required for a self-reported
tracker of this kind, and none is claimed.

All content, branding, and artwork are owned by the developer. The app contains no
third-party protected material.

**On user-generated content (guideline 1.2)**

Club chat, feed posts, comments, handles and club names are written by members.
The app has: a filter that refuses listed terms before anything is posted,
reporting on every piece of member content, blocking with an unblock list, and
published contact details. Terms requiring members to agree to zero tolerance for
objectionable content are shown under every sign-in option, at
https://joinzeroclub.com/terms
