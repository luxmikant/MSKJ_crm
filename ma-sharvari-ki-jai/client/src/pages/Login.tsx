import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import Button from '../components/ui/Button'
import { ShieldCheck } from 'lucide-react'
import { apiFetch, API_BASE } from '../api'

declare global {
  interface Window {
    google?: any
  }
}

export default function Login() {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    // Handle redirect from OAuth code flow
    try {
      const u = new URL(window.location.href)
      const authToken = u.searchParams.get('authToken')
      if (authToken) {
        setToken(authToken)
        window.history.replaceState({}, '', u.pathname)
        navigate('/dashboard')
        return
      }
    } catch {}

    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        callback: async (response: any) => {
          try {
            setLoading(true)
            setError('')
            const idToken = response.credential
            const data = await apiFetch<{ token: string }>(`/api/auth/google`, {
              method: 'POST',
              body: JSON.stringify({ idToken }),
            })
            if (!data?.token) throw new Error('Login failed')
            setToken(data.token)
            navigate('/dashboard')
          } catch (e: any) {
            setError(e?.message || 'Login failed')
          } finally {
            setLoading(false)
          }
        },
      })
      window.google?.accounts.id.renderButton(document.getElementById('google-btn'), { theme: 'outline', size: 'large' })
    }
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [setToken])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome back</h1>
          <p className="text-center text-gray-600 mb-6">Sign in to continue to your dashboard</p>

          {error && <div className="mb-4 text-sm text-red-600 text-center">{error}</div>}

          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <div id="google-btn" className="inline-flex" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true)
                  setError('')
                  const data = await apiFetch<{ token: string }>(`/api/auth/google`, {
                    method: 'POST',
                    body: JSON.stringify({ idToken: 'dev' }),
                  })
                  if (!data?.token) throw new Error('Dev login failed')
                  setToken(data.token)
                  navigate('/dashboard')
                } catch (e: any) {
                  setError(e?.message || 'Dev login failed')
                } finally {
                  setLoading(false)
                }
              }}
              title="Use when AUTH_DISABLED=true on server"
            >
              Continue without Google (dev)
            </Button>
          </div>
          <div className="mt-6 text-center text-xs text-gray-400">
            By continuing you agree to our Terms and Privacy Policy.
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-4">
          Having trouble? Ensure your Google Client ID is set in <code>VITE_GOOGLE_CLIENT_ID</code>.
        </div>
      </div>
    </div>
  )
}
