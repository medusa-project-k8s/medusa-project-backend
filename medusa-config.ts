import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Ensure DB URL is used from env (K8s/container); loadEnv can overwrite with file if present
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('[medusa-config] DATABASE_URL is not set. Set it in the container environment (e.g. K8s Secret).')
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
      connectionTimeoutMillis: 60000,
    },
  },
  admin: {
    vite: (config) => {
      return {
        ...config,
        server: {
          ...config.server,
          host: "0.0.0.0",
          allowedHosts: [
            "localhost",
            ".localhost",
            "127.0.0.1",
          ],
          hmr: {
            ...config.server?.hmr,
            port: 5173,
            clientPort: 5173,
          },
        },
      }
    },
  },
})