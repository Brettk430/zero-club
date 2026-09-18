# Sign in with Apple — turning it on

Everything is built and switched off. This is the setup, in order, once the Apple
Developer Program membership is approved. About 20 minutes.

## What's already in the code

- **Native sign-in on iPhone** — `ios/App/App/AppleSignInPlugin.swift`. Apple's own
  sheet with Face ID, not a web page. A local plugin rather than a dependency: the
  community plugin pins Capacitor below 8 (the iOS build would fail to resolve), and
  the Capacitor 8 alternative links Facebook's and Google's SDKs into the app.
- **Replay protection** — a one-time nonce per sign-in, hashed in Swift (CryptoKit)
  and checked by Supabase.
- **Email only** — the person's name is never requested. Members are a handle first.
- **Token revocation on account deletion** — which Apple requires of every app that
  offers Sign in with Apple. `api/apple/link.js` stores the refresh token at sign-in;
  `api/account/delete.js` revokes it before deleting. A revocation failure is logged
  and never blocks the deletion.

## 1. Xcode — add the capability

1. Open `ios/App/App.xcworkspace` (or `App.xcodeproj`).
2. Target **App** → **Signing & Capabilities** → Team: your paid team.
3. **+ Capability** → **Sign in with Apple**.

Do this only after approval: a free personal team can't sign an app with this
capability, and the build will fail if it's added early.

## 2. developer.apple.com — create a key

1. **Certificates, Identifiers & Profiles → Keys → +**
2. Name it `Zero Club Sign in with Apple`, tick **Sign in with Apple**, Configure →
   primary App ID `com.zeroclub.app`. Continue → Register.
3. **Download the .p8 file. Apple lets you download it exactly once.** Keep it safe.
4. Note the **Key ID** (on the key's page) and your **Team ID** (Membership details).

## 3. Vercel — give the server the key

Project → Settings → Environment Variables, for Production:

| Name | Value |
|---|---|
| `APPLE_TEAM_ID` | Team ID |
| `APPLE_KEY_ID` | Key ID |
| `APPLE_PRIVATE_KEY` | The whole contents of the .p8 file, BEGIN/END lines included |
| `APPLE_BUNDLE_ID` | `com.zeroclub.app` |

Then **Deployments → ⋯ → Redeploy**.

## 4. Supabase — enable the provider

1. Run `supabase/migrations/apple_credentials.sql` in the SQL editor.
2. **Authentication → Providers → Apple** → enable.
3. **Client IDs:** `com.zeroclub.app`

That is all the iPhone app needs. The Secret Key field is only for the website
(step 6), so it can stay empty for now.

## 5. Turn it on in the app

In `.env.local`:

```
VITE_APPLE_SIGNIN=true
```

Then rebuild the app — `npm run build && npx cap sync ios` — and run it on a real
iPhone. The simulator can show the sheet, but a real device is the true test.

**Check:** tap Continue with Apple → Face ID → you're in. Then Profile → Delete my
account, and confirm Vercel's logs show no "Apple token revocation failed" line.

## 6. Optional — the website too

The website can't use the native sheet; it needs a web OAuth setup:

1. developer.apple.com → Identifiers → **+ → Services IDs** → e.g. `com.zeroclub.web`.
   Enable Sign in with Apple → Configure:
   - Domain: `fvbczcrsrprwvwqcents.supabase.co`
   - Return URL: `https://fvbczcrsrprwvwqcents.supabase.co/auth/v1/callback`
2. Supabase → Apple provider: add `com.zeroclub.web` to Client IDs and paste a
   **secret key** generated from the .p8 (Supabase's docs have the generator).
3. Vercel: `VITE_APPLE_SIGNIN_WEB=true`, redeploy.

**That secret key expires after six months** and web Apple sign-in stops working
when it does. Put a calendar reminder on the day you create it. (The iPhone app
and account deletion don't use it and aren't affected.)
