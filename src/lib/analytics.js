import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

if (key) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    autocapture: false, // manual events only — keeps things clean
    persistence: 'localStorage',
  })
}

export const track = (event, properties = {}) => {
  if (!key) return
  posthog.capture(event, properties)
}

export const identify = (userId, properties = {}) => {
  if (!key) return
  posthog.identify(userId, properties)
}

export const reset = () => {
  if (!key) return
  posthog.reset()
}

export default posthog
