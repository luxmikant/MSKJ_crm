import React, { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { apiFetch, API_BASE } from '../api'

export default function Debug() {
  const { token } = useAuth()
  const [status, setStatus] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const endpoints = [
    { name: 'Health Check', path: '/api/health', method: 'GET' },
    { name: 'Auth Debug', path: '/api/auth/debug', method: 'GET' },
    { name: 'Auth Me', path: '/api/auth/me', method: 'GET' },
    { name: 'Dashboard KPIs', path: '/api/dashboard/kpis', method: 'GET' },
    { name: 'Segments List', path: '/api/segments', method: 'GET' },
    { name: 'Campaigns List', path: '/api/campaigns', method: 'GET' },
    { name: 'Customers List', path: '/api/customers', method: 'GET' }
  ]

  const testEndpoint = async (path: string, method: string) => {
    setLoading(true)
    try {
      const data = await apiFetch(path, { method }, token)
      return { success: true, data }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message,
        stack: error.stack
      }
    } finally {
      setLoading(false)
    }
  }

  const testAll = async () => {
    setLoading(true)
    setError(null)
    const results: Record<string, any> = {}
    
    try {
      for (const endpoint of endpoints) {
        results[endpoint.path] = await testEndpoint(endpoint.path, endpoint.method)
      }
      setStatus(results)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">API Connection Debugger</h1>
      
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Settings</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-4">
              <span className="font-medium">API Base URL:</span>
              <code className="col-span-2 bg-gray-100 px-2 py-1 rounded">{API_BASE || '(not set - using default)'}</code>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-medium">Authentication:</span>
              <code className="col-span-2 bg-gray-100 px-2 py-1 rounded">{token ? 'Authenticated' : 'Not authenticated'}</code>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-medium">Google Client ID:</span>
              <code className="col-span-2 bg-gray-100 px-2 py-1 rounded">{import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}</code>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={testAll} 
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test All Endpoints'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Endpoint Results</h2>
        
        {endpoints.map(endpoint => (
          <Card key={endpoint.path} className={`
            ${status[endpoint.path]?.success ? 'border-green-200' : ''}
            ${status[endpoint.path]?.success === false ? 'border-red-200' : ''}
          `}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{endpoint.name}</h3>
                <div className="flex items-center gap-2">
                  {status[endpoint.path] && (
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      status[endpoint.path].success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {status[endpoint.path].success ? 'Success' : 'Failed'}
                    </span>
                  )}
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{`${endpoint.method} ${endpoint.path}`}</code>
                </div>
              </div>

              {status[endpoint.path] && (
                <div>
                  {status[endpoint.path].success ? (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-40 text-xs">
                      {JSON.stringify(status[endpoint.path].data, null, 2)}
                    </pre>
                  ) : (
                    <div className="bg-red-50 p-4 rounded text-red-700 text-sm">
                      <strong>Error:</strong> {status[endpoint.path].error}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const result = await testEndpoint(endpoint.path, endpoint.method)
                    setStatus(prev => ({
                      ...prev,
                      [endpoint.path]: result
                    }))
                  }}
                  disabled={loading}
                >
                  Test Endpoint
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}