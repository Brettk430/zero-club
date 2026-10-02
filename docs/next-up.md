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

Deferred deliberately for launch. Worth building around what members actually do:
start with club chat replies and milestone celebrations, which people are glad to
receive. Needs an APNs key, `@capacitor/push-notifications`, device-token storage,
a sender (Supabase function or a Vercel endpoint), and per-category opt-outs.
The monthly payment reminder already works without any of it — the phone schedules
that locally.

## 5. Tidy after review

- Delete the demo club "Class of 2027" and its four members (Jordan, Priya,
  Marcus, Dana), seeded for screenshots. Keep `appreview@joinzeroclub.com` (Alex)
  as long as Apple may re-review.
- `bkreider11@icloud.com` was created by testing Sign in with Apple and has no
  number set. Harmless; delete or finish onboarding on it.
