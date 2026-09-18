# App Store listing — Zero Club 1.0

Paste-ready copy for App Store Connect. Character limits noted; counts verified
by `docs/check-listing.sh`.

## Names and URLs

| Field | Value |
|---|---|
| App name (30) | `Zero Club: Debt Payoff` |
| Subtitle (30) | `Get to $0. Together.` |
| Primary category | Finance |
| Secondary category | Social Networking |
| Support URL | https://joinzeroclub.com |
| Marketing URL | https://joinzeroclub.com |
| Privacy Policy URL | https://joinzeroclub.com/privacy |
| Age rating | 4+ |
| Bundle ID | com.zeroclub.app |
| Devices | iPhone only, portrait only (`TARGETED_DEVICE_FAMILY = 1`). Runs on iPad in a phone-sized window; a native iPad layout would need 13" iPad screenshots too |

## Promotional text (170)

Free while we build. Name one number, log every payment, and watch it fall —
with a club of people going the same way.

## Description (4000)

Debt is lonely. Zero Club makes it a team sport.

Most money apps bury you in spreadsheets, interest tables and shame. Zero Club
asks for one number — everything you owe, as a single figure — and then helps
you knock it down, in public, with people who get it.

NAME YOUR NUMBER
Takes about ten seconds. One total. No bank connection, no account numbers, no
credentials. You type it, you own it.

LOG EVERY PAYMENT
Every payment moves the number down and becomes a post, a badge, and something
worth sending to a friend. Progress you can actually see.

JOIN A CLUB
Start or join a club by goal or debt type. Compare progress, not balances.
Standings, chat, and shared momentum — the part that keeps you going when
motivation runs out.

CELEBRATE THE MILESTONES
First $1,000. 10% to zero. Halfway. Every step is worth marking, and every
milestone makes a share card you can post anywhere.

BUILT PRIVATE BY DEFAULT
Clubs compare percentages, never dollars, unless you turn that on yourself.
Your balance is never posted. You are a handle first — nobody sees your real
name unless you put it there.

WHAT ZERO CLUB WILL NEVER DO
No bank logins. No selling your data. No shaming you for the number you start
with. Celebrate progress, not size.

Delete your account any time from Profile — it removes everything, immediately,
with no recovery window.

Real people. Real progress. Every payment gets you closer.

## Keywords (100, comma-separated, no spaces)

debt,payoff,debtfree,snowball,avalanche,loans,student,creditcard,tracker,budget,goals,savings,money

## What's New (first release)

The first release of Zero Club. Name your number, log payments, join a club,
and get to $0 together.

---

# App Privacy — nutrition labels

Fill these in App Store Connect under App Privacy. **They must match the code**,
which is the usual reason a submission bounces.

## Data collected and LINKED to the user

| Category | Type | Purpose | Notes |
|---|---|---|---|
| Contact Info | Email Address | App Functionality | Supabase auth — sign-in and password recovery |
| Financial Info | Other Financial Info | App Functionality | The debt total and payment amounts the member types. **Most-missed label.** Not "Payment Info" — that means card numbers, which the app never touches |
| User Content | Photos or Videos | App Functionality | Optional profile photo only |
| User Content | Other User Content | App Functionality | Feed posts, comments, club chat messages |
| Identifiers | User ID | App Functionality, Analytics | Supabase account id; PostHog identifies by this id |
| Usage Data | Product Interaction | Analytics | PostHog pageviews and events, tied to the account id |

## Data NOT collected

Location, Contacts, Health, Browsing History, Search History, Sensitive Info,
Purchases, Payment Info, Diagnostics/Crash Data, Advertising Data.

## Tracking

**No.** Answer "No" to tracking. Nothing is shared with data brokers or
advertisers, and there is no cross-app or cross-site tracking, so the app needs
no App Tracking Transparency prompt.

As of 2026-09-16 the app sends PostHog the account id only — the email address
was removed (commit 058eef1), which is why Contact Info is not listed under
Analytics.

## Account deletion

App Store Connect asks whether the app supports account deletion — **yes**.
Profile → Delete my account, backed by `/api/account/delete`, which removes the
auth user and everything cascading from it.

---

# Blockers before submission

1. **Sign in with Apple is mandatory.** Guideline 4.8: offering Google sign-in
   obliges an equivalent privacy-preserving option. The Apple button is
   currently hidden behind `VITE_APPLE_SIGNIN` because the provider is not
   configured. Either configure Apple (needs the paid membership) and set that
   flag to `true`, or remove Google sign-in. Configuring Apple is the right call.
2. **Screenshots** — 6.9" only is required; 1320 x 2868 from an iPhone 16 Pro Max
   simulator. One minimum, ten maximum. No alpha channel.
3. **Export compliance** — the app uses only standard HTTPS, so the answer to
   "uses non-exempt encryption" is No.
