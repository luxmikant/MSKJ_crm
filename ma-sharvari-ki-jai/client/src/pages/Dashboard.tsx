import React, { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../state/AuthContext'
import Card from '../components/ui/Card'

type KPIs = {
  customers: number
  orders: number
  revenue: number
  revenue30d: number
  activeCampaigns: number
  totalCampaigns: number
}

export default function Dashboard() {
  const { token } = useAuth()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [activity, setActivity] = useState<any>(null)
  const [perf, setPerf] = useState<any[]>([])
  const [dashCampaigns, setDashCampaigns] = useState<any>({ campaigns: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [k, a, p, dc] = await Promise.all([
          apiFetch<{ success: boolean; data: any }>('/api/dashboard/kpis', {}, token),
          apiFetch<{ success: boolean; data: any }>('/api/dashboard/recent-activity?limit=10', {}, token),
          apiFetch<{ success: boolean; data: any }>('/api/dashboard/campaign-performance?days=60', {}, token),
          apiFetch<{ success: boolean; data: any }>('/api/dashboard/campaigns?limit=5', {}, token),
        ])
        if (!cancelled) {
          setKpis(k?.data ?? null)
          setActivity(a?.data ?? null)
          const perfData = Array.isArray(p?.data)
            ? p.data
            : (Array.isArray(p?.data?.performance) ? p.data.performance : [])
          setPerf(perfData)
          const dcData = dc?.data
          const campaigns = Array.isArray(dcData?.campaigns)
            ? dcData.campaigns
            : (Array.isArray(dcData) ? dcData : [])
          setDashCampaigns({
            campaigns,
            pagination: dcData?.pagination ?? { page: 1, limit: 10, total: 0, pages: 0 },
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (loading) return <div>Loading...</div>

  return (
    <div className="grid gap-6">
      <Card>
        <div className="text-lg font-semibold mb-4">Recent Campaigns</div>
        <div className="space-y-2 text-sm">
          {(dashCampaigns?.campaigns ?? []).map((c: any) => (
            <div key={c._id} className="flex items-center justify-between border rounded p-2 bg-white">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{c.channel}</div>
                <div className={`inline-block px-2 py-1 rounded text-xs ${
                  c.status === 'running' ? 'bg-green-100 text-green-700' :
                  c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                  c.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {c.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-500">Customers</div>
          <div className="text-2xl font-semibold">{kpis?.customers ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Orders</div>
          <div className="text-2xl font-semibold">{kpis?.orders ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Revenue (30d)</div>
          <div className="text-2xl font-semibold">${kpis?.revenue30d?.toFixed(2) ?? '0.00'}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-semibold">${kpis?.revenue?.toFixed(2) ?? '0.00'}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active Campaigns</div>
          <div className="text-2xl font-semibold">{kpis?.activeCampaigns ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Campaigns</div>
          <div className="text-2xl font-semibold">{kpis?.totalCampaigns ?? 0}</div>
        </Card>
      </div>

      <Card>
        <div className="text-lg font-semibold mb-4">Recent Activity</div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">Orders</div>
            <ul className="space-y-1">
              {(Array.isArray(activity?.recentOrders) ? activity.recentOrders : []).map((o: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>#{o.externalOrderId} • {o.status}</span>
                  <span>${o.orderTotal?.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">New Customers</div>
            <ul className="space-y-1">
              {(Array.isArray(activity?.recentCustomers) ? activity.recentCustomers : []).map((c: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-gray-500">{c.email}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Recent Campaigns</div>
            <ul className="space-y-1">
              {(Array.isArray(activity?.recentCampaigns) ? activity.recentCampaigns : []).map((c: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    c.status === 'running' ? 'bg-green-100 text-green-700' :
                    c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Comms</div>
            <ul className="space-y-1">
              {(Array.isArray(activity?.recentLogs) ? activity.recentLogs : []).map((l: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{l.status}</span>
                  <span className="text-gray-500">{l.channel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-lg font-semibold mb-4">Campaign Performance (60d)</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-2">Campaign</th>
                <th className="p-2">Status</th>
                <th className="p-2">Sent</th>
                <th className="p-2">Delivered</th>
                <th className="p-2">Opened</th>
                <th className="p-2">Clicked</th>
                <th className="p-2">Failed</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((r: any) => (
                <tr key={r.campaignId} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.metrics?.SENT ?? 0}</td>
                  <td className="p-2">{r.metrics?.DELIVERED ?? 0}</td>
                  <td className="p-2">{r.metrics?.OPENED ?? 0}</td>
                  <td className="p-2">{r.metrics?.CLICKED ?? 0}</td>
                  <td className="p-2">{r.metrics?.FAILED ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
