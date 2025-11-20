import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, NavLink, useNavigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './state/AuthContext'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Segments from './pages/Segments'
import Campaigns from './pages/Campaigns'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Button from './components/ui/Button'
import Dashboard from './pages/Dashboard'
import Insights from './pages/Insights'
import CustomerProfile from './pages/CustomerProfile'
import UserProfile from './pages/UserProfile'
import Debug from './pages/Debug'
import { CampaignBuilder } from './components/CampaignBuilder'

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { setToken } = useAuth()
  const navigate = useNavigate()
  return (
  <div className="min-h-full grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-blue-600" />
          <div>
            <div className="text-base font-semibold">MSKJ CRM</div>
            <div className="text-xs text-gray-500">Mini Customer Platform</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink to="/dashboard" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Dashboard</NavLink>
          <NavLink to="/segments" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Segments Builder</NavLink>
          <NavLink to="/campaigns" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Campaigns Manager</NavLink>
          <NavLink to="/customers" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Customers</NavLink>
          <NavLink to="/orders" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Orders</NavLink>
          <NavLink to="/insights" className={({isActive})=>`px-3 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>Insights</NavLink>
        </nav>
        <div className="mt-auto space-y-2">
          <NavLink to="/profile" className={({isActive})=>`flex items-center px-3 py-2 rounded-md text-sm ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
            Settings
          </NavLink>
          <Button
            variant="ghost"
            className="text-red-600 w-full justify-start px-3"
            onClick={()=>{
              setToken(null)
              navigate('/', { replace: true })
            }}
          >
            Logout
          </Button>
        </div>
      </aside>
      <main className="p-6 bg-gray-50">{children}</main>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/dashboard', element: <Protected><AppLayout><Dashboard /></AppLayout></Protected> },
  { path: '/segments', element: <Protected><AppLayout><Segments /></AppLayout></Protected> },
  { path: '/campaigns', element: <Protected><AppLayout><Campaigns /></AppLayout></Protected> },
  { path: '/campaigns/new', element: <Protected><AppLayout><CampaignBuilder /></AppLayout></Protected> },
  { path: '/customers', element: <Protected><AppLayout><Customers /></AppLayout></Protected> },
  { path: '/customers/:id', element: <Protected><AppLayout><CustomerProfile /></AppLayout></Protected> },
  { path: '/orders', element: <Protected><AppLayout><Orders /></AppLayout></Protected> },
  { path: '/insights', element: <Protected><AppLayout><Insights /></AppLayout></Protected> },
  { path: '/insights/*', element: <Protected><AppLayout><Insights /></AppLayout></Protected> },
  { path: '/profile', element: <Protected><AppLayout><UserProfile /></AppLayout></Protected> },
  { path: '/debug', element: <Debug /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AuthProvider>
  </React.StrictMode>
)
