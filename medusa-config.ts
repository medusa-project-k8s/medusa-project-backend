import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Ensure DB URL is used from env (K8s/container); loadEnv can overwrite with file if present
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('[medusa-config] DATABASE_URL is not set. Set it in the container environment (e.g. K8s Secret).')
}

// Public URL where the backend is reachable (browser). Used for image/file URLs returned by the API.
// Medusa local file provider serves under /static, so URLs are backend_url + path (e.g. .../static/...).
const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:9000"
const backendFileUrl = backendPublicUrl.replace(/\/$/, "") + "/static"

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
    // So session cookie works over http:// (e.g. port-forward to localhost). Set COOKIE_SECURE=true when behind HTTPS.
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
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
          // Allow access via ingress IP (e.g. 192.168.0.160) and localhost
          allowedHosts: true,
          hmr: {
            ...config.server?.hmr,
            port: 5173,
            clientPort: 5173,
          },
        },
      }
    },
  },
  // So image/file URLs returned by the API use the public URL (e.g. http://192.168.0.160) instead of localhost
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: backendFileUrl,
            },
          },
        ],
      },
    },
  ],
})