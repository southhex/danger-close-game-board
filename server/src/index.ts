import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import {
  healthRoutes,
  authRoutes,
  campaignRoutes,
  bootstrapRoutes,
  squadRoutes,
  missionRoutes,
  reqRoutes,
} from './routes/index.js'

const isProduction = process.env.NODE_ENV === 'production'
const port = parseInt(process.env.PORT ?? (isProduction ? '8080' : '3001'))

const app = new Hono()

// Mount API routes
app.route('/api', healthRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/campaigns', campaignRoutes)
app.route('/api/bootstrap', bootstrapRoutes)
app.route('/api', squadRoutes)
app.route('/api', missionRoutes)
app.route('/api', reqRoutes)

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

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[server] Listening on http://0.0.0.0:${info.port} (${isProduction ? 'production' : 'development'})`)
})
