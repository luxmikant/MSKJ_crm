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
  
  if (!res.ok) {
    let errorMessage = `${res.status} ${res.statusText}`
    try {
      const errorData = await res.text()
      if (errorData) {
        const parsed = JSON.parse(errorData)
        errorMessage = parsed.message || parsed.error || errorMessage
      }
    } catch {
      // Failed to parse error response, use status text
    }
    throw new Error(errorMessage)
  }
  
  // Handle empty responses
  const contentType = res.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Expected JSON response from server')
  }
  
  const text = await res.text()
  if (!text) {
    throw new Error('Empty response from server')
  }
  
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
  }
}
