// Edge middleware — returns pre-filled HTML to crawlers so they see real content
// Regular users get the normal SPA

export const config = { matcher: ['/'] }

const BOT_PATTERN = /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram/i

const PRERENDER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Zero Club — Debt Payoff Accountability Platform</title>
  <meta name="description" content="Zero Club is the accountability platform for debt payoff. Make monthly commitments, check in consistently, build streaks, and reach zero debt faster with AI coaching and community support."/>
  <meta property="og:title" content="Zero Club — Debt freedom is a habit. We build it with you."/>
  <meta property="og:description" content="The accountability platform for debt payoff. Monthly commitments, AI coaching, and a community of people who get it."/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="https://zero-club1.vercel.app/"/>
  <meta property="og:image" content="https://zero-club1.vercel.app/og-image.png"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Zero Club — Debt freedom is a habit."/>
  <meta name="twitter:description" content="The accountability platform for debt payoff."/>
  <meta name="twitter:image" content="https://zero-club1.vercel.app/og-image.png"/>
</head>
<body>
  <h1>Zero Club — Debt Payoff Accountability Platform</h1>
  <p>Zero Club is the accountability platform for debt payoff. Make monthly commitments, check in consistently, build streaks, and reach zero debt faster with AI coaching and community support.</p>
  <h2>How it works</h2>
  <ol>
    <li>Make a commitment — set a specific monthly pledge toward your debt</li>
    <li>Check in monthly — answer four accountability questions each month</li>
    <li>Build your streak — consecutive months of follow-through compound</li>
    <li>Reach zero — debt freedom through consistent behavior, not just math</li>
  </ol>
  <h2>Features</h2>
  <ul>
    <li>Debt avalanche calculator — minimize total interest paid</li>
    <li>Monthly commitment tracking with streaks</li>
    <li>Miles — AI behavior coach focused on consistency, not generic advice</li>
    <li>Accountability community — small groups by goal year and debt type</li>
    <li>Milestone achievements — celebrate every step toward zero</li>
  </ul>
  <h2>Pricing</h2>
  <p>Free tier includes debt tracking, commitments, and streaks. Premium ($9/month) adds unlimited AI coaching and accountability circles.</p>
</body>
</html>`

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || ''
  if (BOT_PATTERN.test(ua)) {
    return new Response(PRERENDER_HTML, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }
  // Regular user — let the SPA handle it
  return undefined
}
