// Edge middleware — returns pre-filled HTML to crawlers so they see real content
// Regular users get the normal SPA

export const config = { matcher: ['/'] }

const BOT_PATTERN = /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram/i

const PRERENDER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Zero Club — Get to $0. Together.</title>
  <meta name="description" content="Zero Club is the social club for getting out of debt. Track one number down to zero, join a club, log every payment, and celebrate the milestones with people going the same way."/>
  <meta property="og:title" content="Zero Club — Get to $0. Together."/>
  <meta property="og:description" content="The social club for becoming debt-free. One number, down to zero, with people going the same way."/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="https://joinzeroclub.com/"/>
  <meta property="og:image" content="https://joinzeroclub.com/brand/share.jpg"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="Zero Club — Get to $0. Together."/>
  <meta name="twitter:description" content="The social club for becoming debt-free."/>
  <meta name="twitter:image" content="https://joinzeroclub.com/brand/share.jpg"/>
</head>
<body>
  <h1>Zero Club — Get to $0. Together.</h1>
  <p>Zero Club is the social club for becoming debt-free. One total, tracked down to zero, alongside people going the same way.</p>
  <h2>How it works</h2>
  <ol>
    <li>Name your number — the one total you are getting to zero</li>
    <li>Log every payment — each one moves the number down</li>
    <li>Join a club — small groups by goal and debt type</li>
    <li>Hit milestones — every step toward zero is worth celebrating</li>
  </ol>
  <h2>Features</h2>
  <ul>
    <li>One number, tracked to zero — no spreadsheet, no shame</li>
    <li>Clubs with standings, chat, and shared progress</li>
    <li>A feed of real payments and real milestones</li>
    <li>Shareable milestone cards</li>
    <li>Privacy controls — show your progress as a percentage instead of a dollar figure</li>
  </ul>
  <p>Real people. Real progress. Every payment gets you closer.</p>
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
