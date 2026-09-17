import axios from "axios";

// Always same-origin: Vite dev proxy (vite.config.ts) or the Vercel rewrite (vercel.json)
// forwards this to the real backend. Keeping it same-origin means auth cookies are
// first-party, so they aren't blocked by browsers' third-party-cookie rules.
export const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Track ongoing refresh to avoid multiple simultaneous refresh attempts
let refreshPromise: Promise<any> | null = null;

// Add response interceptor to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already tried to refresh, attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
          .then(() => {
            refreshPromise = null;
            return api(originalRequest); // Retry original request
          })
          .catch((err) => {
            refreshPromise = null;
            // Refresh failed, let original error through
            return Promise.reject(err);
          });
      }

      return refreshPromise;
    }

    return Promise.reject(error);
  }
);

export function formatApiError(err: unknown): string {
  const detail = (err as any)?.response?.data?.detail;
  if (detail == null) return (err as any)?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
