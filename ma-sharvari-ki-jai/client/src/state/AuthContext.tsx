import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextType = {
  token: string | null
  setToken: (t: string | null) => void
}

const AuthContext = createContext<AuthContextType>({ token: null, setToken: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem('mskj_token') } catch { return null }
  })
  useEffect(() => {
    try {
      if (token) localStorage.setItem('mskj_token', token)
      else localStorage.removeItem('mskj_token')
    } catch {}
  }, [token])
  const value = useMemo(() => ({ token, setToken }), [token])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
