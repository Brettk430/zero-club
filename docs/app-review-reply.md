# Reply to App Review — Guideline 2.1, Information Needed

Sent 2026-10-03. Fits App Store Connect's 4,000-character limit (3,700).
Paste into the review message thread and into App Review Information → Notes.

```
2. PURPOSE AND AUDIENCE

Zero Club helps people pay off debt by tracking one number — everything they owe, as a single figure — alongside other people rather than alone.

The audience is adults with consumer debt: student loans, credit cards, car loans, medical bills. The problem is motivational, not mathematical. Payoff calculators already exist; what people lack is accountability over the years it takes. Each payment becomes visible progress, a milestone, and something a small group can see and respond to — closer to a running club than a budgeting app.

Members type in what they owe. The app never connects to a bank, never sees account numbers or credentials, and never moves money.

3. SETUP AND MAIN FEATURES

Demo account (also in App Review Information):
Email: appreview@joinzeroclub.com
Password: ZeroClub-Review-2026

It already has a balance, payment history, badges, and a club with other members and chat, so every feature is reachable immediately.

- Log a payment: green + button in the tab bar. Enter an amount, tap ELIMINATE. The balance drops and a post appears in the feed.
- Clubs: Clubs tab. The account is in "Class of 2027" — open it for Standings and Chat. "Find a club" lists public clubs; clubs can be created there too.
- Feed: payments and milestones from all members, with reactions and comments.
- Report and block: the ⋯ beside any post, comment, chat message or profile from another member. Reporting asks a reason; blocking is reversible under Profile > Edit profile > Blocked.
- Account deletion: Profile (avatar, top right) > Edit profile > Delete my account. Immediate and permanent.
- Sign in with Apple, Google, and email are all offered.

No paid features, no in-app purchases, no subscriptions.

4. EXTERNAL SERVICES

- Supabase: hosted authentication and PostgreSQL database (accounts, balances, payments, clubs, messages). The only store of member data.
- Vercel: web hosting and two serverless endpoints — account deletion, and exchanging the Sign in with Apple authorization code so Apple tokens can be revoked on deletion.
- Sign in with Apple and Google Sign-In: authentication only.
- PostHog: product analytics (which screens are used), tied to an account ID. No email, no financial figures.
- Cloudflare: DNS.

No payment processors, no AI services, no data providers, no bank aggregation, no advertising networks.

5. REGIONAL DIFFERENCES

None. The app behaves identically everywhere. No region-gated content, no localisation, no geographic restriction. Interface is English, amounts display in US dollars, and members anywhere can track any figure they enter.

6. REGULATED INDUSTRY AND THIRD-PARTY MATERIAL

Zero Club is not a financial institution or financial service. It does not lend, move, hold or transfer money; does not connect to banks or payment networks; does not provide debt settlement, consolidation, credit repair or credit reporting; and gives no financial, legal or tax advice. The Terms state this: https://joinzeroclub.com/terms

Every figure is typed in by the member — a self-reported note to themselves. No licence or authorisation is required for a tracker of this kind, and none is claimed.

All content, branding and artwork are owned by the developer. No third-party protected material.

USER-GENERATED CONTENT (1.2)

Club chat, feed posts, comments, handles and club names are member-written. The app has a filter that refuses listed terms before posting, reporting on every piece of member content, blocking with an unblock list, and published contact details. Terms requiring agreement to zero tolerance for objectionable content appear under every sign-in option: https://joinzeroclub.com/terms
```
