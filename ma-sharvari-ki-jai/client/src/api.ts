// In production deployment, this should be set to the backend URL (e.g., https://mskj-crm-server.onrender.com)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://mskj-crm-server.onrender.com'

function withBase(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  
  // Make sure we have a proper base URL with no trailing slash
  const base = API_BASE.replace(/\/$/, '')
  // Make sure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  return `${base}${normalizedPath}`
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(opts.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  
  try {
    console.log(`Fetching ${withBase(path)}`)
    const res = await fetch(withBase(path), { ...opts, headers })
    
    if (!res.ok) {
      let errorMessage = `${res.status} ${res.statusText}`
      try {
        const errorData = await res.text()
        if (errorData) {
          try {
            const parsed = JSON.parse(errorData)
            errorMessage = parsed.message || parsed.error || errorMessage
          } catch {
            // Not JSON, use the raw error text if it looks meaningful
            if (errorData.length < 200) errorMessage = errorData
          }
        }
      } catch {
        // Failed to parse error response, use status text
      }
      throw new Error(errorMessage)
    }
    
    // Handle empty responses or non-JSON responses
    const contentType = res.headers.get('content-type')
    
    if (!contentType) {
      console.warn('No content-type header in response')
      // Try to parse as JSON anyway, might still work
    } else if (!contentType.includes('application/json')) {
      console.warn(`Unexpected content-type: ${contentType}`)
      // If it's not JSON, but we got a successful response, let's try anyway
    }
    
    const text = await res.text()
    
    if (!text) {
      // For empty but successful responses (204 No Content), return an empty object
      return {} as T
    }
    
    try {
      return JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse response as JSON:', text.substring(0, 100))
      throw new Error(`Server returned invalid JSON. Please check server logs.`)
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server at ${API_BASE}. Please make sure the server is running.`)
    }
    throw error
  }
}
