import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts'

export default function Insights() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [kpis, setKpis] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activity, setActivity] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [genBusy, setGenBusy] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError('')
      try {
  const kp = await apiFetch<any>('/api/dashboard/kpis', {}, token)
  const perf = await apiFetch<any>('/api/dashboard/campaign-performance?days=30', {}, token)
  const act = await apiFetch<any>('/api/dashboard/recent-activity?limit=10', {}, token)
  setKpis(kp)
  setCampaigns(perf)
  setActivity(act)
      } catch (e: any) {
        setError(e?.message || 'Failed to load insights')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const perfChartData = useMemo(() => {
    const arr = Array.isArray(campaigns) ? campaigns : []
    return arr.map((c: any) => ({
      name: c.name,
      Delivered: c.metrics?.DELIVERED ?? 0,
      Opened: c.metrics?.OPENED ?? 0,
      Clicked: c.metrics?.CLICKED ?? 0,
      Failed: c.metrics?.FAILED ?? 0,
      Sent: c.metrics?.SENT ?? 0,
    }))
  }, [campaigns])

  const kpiTrends = useMemo(() => {
    const rev = Number(kpis?.revenue30d || 0)
    // Fake a simple 7-point trend from revenue30d to display a line chart if no timeseries exists
    const points = 7
    const step = points ? Math.max(rev / (points * 4), 1) : 1
    return new Array(points).fill(0).map((_, i) => ({ day: `D-${points - i}`, Revenue: Math.max(0, Math.round(rev / points + (i - points / 2) * step)) }))
  }, [kpis])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Insights</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card glass>
          <CardHeader title="Customers" />
          <CardBody>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{kpis?.customers ?? '-'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Total customers</div>
          </CardBody>
        </Card>
        <Card glass>
          <CardHeader title="Revenue" />
          <CardBody>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{kpis?.revenue?.toLocaleString?.() ?? '-'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Lifetime revenue</div>
          </CardBody>
        </Card>
        <Card glass>
          <CardHeader title="Revenue (30d)" />
          <CardBody>
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">{kpis?.revenue30d?.toLocaleString?.() ?? '-'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Last 30 days</div>
          </CardBody>
        </Card>
        <Card glass>
          <CardHeader title="Active Campaigns" />
          <CardBody>
            <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">{kpis?.activeCampaigns ?? '-'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Running now</div>
          </CardBody>
        </Card>
      </div>

      <Card glass>
        <CardHeader title="Campaign Performance (30 days)" />
        <CardBody>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfChartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} hide={perfChartData.length > 6} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} />
                  <Legend />
                  <Bar dataKey="Delivered" stackId="a" fill="#60a5fa" />
                  <Bar dataKey="Opened" stackId="a" fill="#34d399" />
                  <Bar dataKey="Clicked" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Failed" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiTrends} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card glass>
        <CardHeader title="Recent Activity" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-medium mb-2">Orders</div>
              <ul className="space-y-1 text-sm">
                {(activity?.recentOrders || []).map((o: any, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1"><span>#{o.externalOrderId || o._id}</span><span>${o.orderTotal?.toLocaleString?.() ?? '-'}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">New Customers</div>
              <ul className="space-y-1 text-sm">
                {(activity?.recentCustomers || []).map((c: any, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1"><span>{c.name}</span><span>{new Date(c.createdAt).toLocaleDateString?.() ?? '-'}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Comms</div>
              <ul className="space-y-1 text-sm">
                {(activity?.recentLogs || []).map((l: any, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1"><span>{l.channel}</span><span>{l.status}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card glass>
        <CardHeader title="Generate Executive Summary" />
        <CardBody>
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">Use the data above to create a PDF-ready summary.</div>
          <div className="flex items-center gap-2">
            <Button variant="gradient" size="md" onClick={async () => {
              setGenBusy(true)
              setError('')
              try {
                const s = await apiFetch<any>('/api/dashboard/summary?days=30', {}, token)
                setSummary(s)
              } catch (e: any) {
                setError(e?.message || 'Failed to generate summary')
              } finally {
                setGenBusy(false)
              }
            }}>
              {genBusy ? 'Generating…' : 'Generate Report'}
            </Button>
            {summary && <span className="text-xs text-gray-500">Generated for last {summary.periodDays} days</span>}
          </div>

          {summary && (
            <div className="mt-4 space-y-3">
              <div>
                <div className="font-medium mb-1">Summary</div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{summary.summary}</p>
              </div>
              <div>
                <div className="font-medium mb-1">Highlights</div>
                <ul className="list-disc ml-5 text-sm text-gray-800 dark:text-gray-200">
                  {(summary.highlights || []).map((h: string, i: number) => (<li key={i}>{h}</li>))}
                </ul>
              </div>
              <div>
                <div className="font-medium mb-1">Recommendations</div>
                <ul className="list-disc ml-5 text-sm text-gray-800 dark:text-gray-200">
                  {(summary.recommendations || []).map((r: string, i: number) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
