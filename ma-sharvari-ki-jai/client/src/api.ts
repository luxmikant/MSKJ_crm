export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function withBase(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path}`
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(opts.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(withBase(path), { ...opts, headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}
