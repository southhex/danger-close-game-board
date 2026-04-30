import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { healthRoutes, authRoutes } from './routes/index.js'

const isProduction = process.env.NODE_ENV === 'production'
const port = parseInt(process.env.PORT ?? (isProduction ? '8080' : '3001'))

const app = new Hono()

// Mount API routes
app.route('/api', healthRoutes)
app.route('/api/auth', authRoutes)

// In production, serve the Vite-built frontend for all non-/api paths
if (isProduction) {
  app.use(
    '/*',
    serveStatic({
      root: './dist',
    })
  )
  // SPA fallback — serve index.html for unmatched routes
  app.get('/*', serveStatic({ path: './dist/index.html' }))
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] Listening on http://localhost:${info.port} (${isProduction ? 'production' : 'development'})`)
})
