#!/bin/sh
# Xcode Cloud runs this after cloning, before the build. Zero Club is a web app
# in a native shell, so the web side has to be built and copied into the iOS
# project first — xcodebuild alone would package whatever stale copy was
# committed, or nothing at all.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Xcode Cloud images don't ship Node.
if ! command -v node > /dev/null 2>&1; then
  echo "Installing Node…"
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
echo "Node $(node -v), npm $(npm -v)"

# Vite bakes these into the bundle at build time. Without them the app ships
# with no database connection at all, so stop rather than produce a dead build.
for name in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY; do
  eval "value=\$$name"
  if [ -z "$value" ]; then
    echo "error: $name is not set. Add it to the workflow's environment variables in Xcode Cloud."
    exit 1
  fi
done

cat > .env.production <<ENV
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://joinzeroclub.com}
VITE_APPLE_SIGNIN=${VITE_APPLE_SIGNIN:-true}
VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST:-https://us.i.posthog.com}
ENV

npm ci
npm run build
npx cap sync ios

echo "Web build copied into ios/App/App/public — handing over to Xcode."
