# Next up

Queued after the 1.0 submission (2026-10-01). Nothing here blocks review.

## 1. Stop collecting names from Google

`signInWithProvider` asks Google for the `profile` scope, so Supabase stores each
member's full name even though nothing in the app shows it. Narrow the request to
email only, then:

- untick **Contact Info → Name** in App Store Connect → App Privacy (no review needed)
- drop the matching entry from `ios/App/App/PrivacyInfo.xcprivacy`

Zero Club is handle-first by design; collecting a real name it never uses is
worth removing rather than disclosing.

## 2. Add Name to the privacy manifest in the meantime

Until (1) ships, `PrivacyInfo.xcprivacy` and the App Store privacy answers
disagree: the manifest omits Name, the listing declares it. Harmless for review —
Apple reads the manifest mainly for API-usage declarations — but they should match.
Skip this if (1) lands first.

## 3. Harden the goal date in onboarding

`StepDate` sets a default goal from an effect on mount, and `commitAnswers` reads
the `goal` state. Advancing within the same frame as that effect can commit an
empty goal (seen only under scripted speed, never by hand). Have `commitAnswers`
fall back to the step's own month/year rather than trusting the parent state.

## 4. Push notifications

Built (2026-11-16) for iOS: club chat messages and clubmates' milestones, with an
on/off for each under Profile → Edit → Notifications. iOS asks for permission
the first time a member posts in club chat, or from that settings section.
To switch it on:

- Run `supabase/migrations/push_notifications.sql` in the Supabase SQL editor.
- developer.apple.com → Certificates, IDs & Profiles → Keys → **+**, tick
  **Apple Push Notifications service (APNs)**, download the `.p8`.
- Vercel → zero-club → Settings → Environment Variables: `APNS_KEY_ID` (the
  key's ID) and `APNS_PRIVATE_KEY` (the `.p8` contents). `APPLE_TEAM_ID` is
  already there from Sign in with Apple. Redeploy.
- Ship a new build: the app now carries the Push Notifications entitlement.

Until the key is set, `/api/push/notify` answers `not_configured` and the app
carries on as before. Android needs a Firebase project and
`android/app/google-services.json` before it can register; the app doesn't try
there yet. The monthly payment reminder is still a local notification.

## 5. Tidy after review

- Delete the demo club "Class of 2027" and its four members (Jordan, Priya,
  Marcus, Dana), seeded for screenshots. Keep `appreview@joinzeroclub.com` (Alex)
  as long as Apple may re-review.
- `bkreider11@icloud.com` was created by testing Sign in with Apple and has no
  number set. Harmless; delete or finish onboarding on it.
