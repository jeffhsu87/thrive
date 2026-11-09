import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assistantPlugin } from './server/assistantApi.js'

export default defineConfig(({ mode }) => {
  // Make ANTHROPIC_* values from .env / .env.local available to the server-side coach endpoint.
  // They are not exposed to browser code (only VITE_-prefixed variables are).
  const env = loadEnv(mode, process.cwd(), 'ANTHROPIC_')
  for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

  return {
    plugins: [react(), assistantPlugin()],
  }
th})
