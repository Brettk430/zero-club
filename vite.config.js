import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel-style functions in api/ during local dev so features like
// the AI coach work without `vercel dev`. Adds the res.status/json helpers the
// handlers expect and parses JSON bodies, mirroring the Vercel runtime.
const localApi = (env) => ({
  name: 'local-api',
  configureServer(server) {
    Object.assign(process.env, env)
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next()
      const route = req.url.split('?')[0].replace(/^\/api\//, '')
      let handler
      try {
        const mod = await server.ssrLoadModule(`/api/${route}.js`)
        handler = mod.default
      } catch {
        res.statusCode = 404
        return res.end(JSON.stringify({ error: `No API route: ${route}` }))
      }

      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks)
      try {
        req.body = raw.length ? JSON.parse(raw.toString()) : {}
      } catch {
        req.body = {}
      }

      res.status = (code) => { res.statusCode = code; return res }
      res.json = (obj) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(obj))
        return res
      }

      try {
        await handler(req, res)
      } catch (err) {
        console.error(`API ${route} error:`, err)
        if (!res.writableEnded) res.status(500).json({ error: err.message })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localApi(env)],
  }
})
