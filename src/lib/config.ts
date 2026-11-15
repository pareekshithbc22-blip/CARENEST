/**
 * Application URL and Environment Configuration
 * Dynamically resolves application base URL for transactional emails,
 * redirects, and server-side operations across deployment platforms (Vercel, Render, Railway, localhost).
 */
export function getAppUrl(): string {
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim().length > 0) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (process.env.RAILWAY_STATIC_URL && process.env.RAILWAY_STATIC_URL.trim().length > 0) {
    return `https://${process.env.RAILWAY_STATIC_URL.replace(/\/$/, "")}`;
  }
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim().length > 0) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
