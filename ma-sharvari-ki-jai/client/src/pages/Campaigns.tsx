import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import Button from '../components/ui/Button'

type Segment = { _id: string, name: string }
type Campaign = { _id: string, name: string, status?: string, counts: { total:number, sent:number, failed:number, delivered:number }, createdAt: string }
type Log = { _id: string, status: string, payload?: any, createdAt: string }

export default function Campaigns() {
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [segments, setSegments] = useState<Segment[]>([])
  const querySegmentId = useMemo(() => new URLSearchParams(location.search).get('segmentId') || '', [location.search])
  const [segmentId, setSegmentId] = useState(querySegmentId)
  const [channel, setChannel] = useState<'EMAIL'|'SMS'>('EMAIL')
  const [template, setTemplate] = useState('Hello {{name}}, welcome!')
  const [name, setName] = useState('Campaign')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsTotal, setCampaignsTotal] = useState<number>(0)
  const [cSkip, setCSkip] = useState<number>(0)
  const [cLimit, setCLimit] = useState<number>(5)
  const [drafts, setDrafts] = useState<Campaign[]>([])
  const [draftsTotal, setDraftsTotal] = useState<number>(0)
  const [dSkip, setDSkip] = useState<number>(0)
  const [dLimit, setDLimit] = useState<number>(5)
  const [selected, setSelected] = useState<string>('')
  const [logs, setLogs] = useState<Log[]>([])
  const [logsTotal, setLogsTotal] = useState<number>(0)
  const [lSkip, setLSkip] = useState<number>(0)
  const [lLimit, setLLimit] = useState<number>(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [goal, setGoal] = useState<string>('Announce 10% discount for VIPs')
  const [tone, setTone] = useState<'friendly'|'formal'|'excited'>('friendly')
  const [variablesText, setVariablesText] = useState<string>('name')
  const [variants, setVariants] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState<boolean>(false)

  useEffect(() => {
    (async () => {
      const segs = await apiFetch<{items: Segment[]}>('/api/segments', {}, token)
      setSegments(segs.items || [])
    })()
  }, [token])

  const loadCampaigns = async (skip = cSkip, limit = cLimit) => {
    const qs = `?skip=${skip}&limit=${limit}`
    const cs = await apiFetch<{items: Campaign[], total: number}>(`/api/campaigns${qs}`, {}, token)
    setCampaigns(cs.items || [])
    setCampaignsTotal(cs.total || 0)
    setCSkip(skip)
    setCLimit(limit)
  }

  useEffect(() => { loadCampaigns(0, cLimit) }, [token])

  const loadDrafts = async (skip = dSkip, limit = dLimit) => {
    const qs = `?status=draft&skip=${skip}&limit=${limit}`
    const cs = await apiFetch<{items: Campaign[], total: number}>(`/api/campaigns${qs}`, {}, token)
    setDrafts(cs.items || [])
    setDraftsTotal(cs.total || 0)
    setDSkip(skip)
    setDLimit(limit)
  }

  useEffect(() => { loadDrafts(0, dLimit) }, [token])

  const create = async () => {
    const res = await apiFetch<{campaignId: string}>('/api/campaigns', {
      method: 'POST', body: JSON.stringify({ name, segmentId, channel, template })
    }, token)
    alert(`Created campaign ${res.campaignId}`)
    const cs = await apiFetch<{items: Campaign[]}>('/api/campaigns', {}, token)
    setCampaigns(cs.items || [])
  }

  const simulateSend = async (campaignId: string) => {
    await apiFetch('/api/campaigns/vendor/send', { method: 'POST', body: JSON.stringify({ campaignId }) }, token)
    await loadCampaigns()
  }

  const loadLogs = async (campaignId: string, skip = lSkip, limit = lLimit) => {
    setSelected(campaignId)
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('skip', String(skip))
    if (statusFilter) params.set('status', statusFilter)
    if (channelFilter) params.set('channel', channelFilter)
    if (fromDate) params.set('from', new Date(fromDate).toISOString())
    if (toDate) params.set('to', new Date(toDate).toISOString())
    const r = await apiFetch<{items?: Log[], total: number}>(`/api/campaigns/${campaignId}/logs?${params.toString()}`, {}, token)
    setLogs(r.items || [])
    setLogsTotal(r.total || 0)
    setLSkip(skip)
    setLLimit(limit)
  }

  const doSuggest = async () => {
    setSuggesting(true)
    try {
      const variables = variablesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const r = await apiFetch<{ variants: string[] }>(
        '/api/ai/suggest-message',
        {
          method: 'POST',
          body: JSON.stringify({ goal, brand: 'MSKJ', tone, channel, variables })
        },
        token
      )
      setVariants(r.variants || [])
    } catch (e: any) {
      alert(e?.message || 'Failed to get suggestions')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/campaigns/new?mode=ai')}>
            🤖 Build Campaign with AI
          </Button>
          <Button variant="secondary" onClick={() => navigate('/campaigns/new')}>
            📧 Manual Builder
          </Button>
        </div>
      </div>
      <div className="bg-white p-4 border rounded space-y-2">
        <div className="flex gap-2 items-center">
          <input className="border px-2 py-1" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <select className="border px-2 py-1" value={segmentId} onChange={e=>setSegmentId(e.target.value)}>
            <option value="">Select Segment</option>
            {segments.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="border px-2 py-1" value={channel} onChange={e=>setChannel(e.target.value as any)}>
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        <textarea className="border w-full px-2 py-1 h-24" value={template} onChange={e=>setTemplate(e.target.value)} />
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={create} disabled={!segmentId}>Create</button>
      </div>

      <div className="bg-white p-4 border rounded space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Draft Campaigns</h2>
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select className="border px-2 py-1" value={dLimit} onChange={e=>loadDrafts(0, Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>recent drafts</span>
          </div>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-500">No drafts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Name</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d._id} className="border-t">
                  <td>{d.name}</td>
                  <td>{d.status || 'draft'}</td>
                  <td>{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="space-x-2">
                    <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>navigate(`/campaigns/new?restore=${d._id}`)}>Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span>Total: {draftsTotal}</span>
          <button className="px-2 py-1 bg-gray-200 rounded" disabled={dSkip<=0} onClick={()=>loadDrafts(Math.max(0, dSkip - dLimit), dLimit)}>Prev</button>
          <button className="px-2 py-1 bg-gray-200 rounded" disabled={dSkip + dLimit >= draftsTotal} onClick={()=>loadDrafts(dSkip + dLimit, dLimit)}>Next</button>
        </div>
      </div>

      <div className="bg-white p-4 border rounded space-y-2">
        <h2 className="font-medium">Suggest message (AI)</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="border px-2 py-1 flex-1" placeholder="Goal" value={goal} onChange={e=>setGoal(e.target.value)} />
          <select className="border px-2 py-1" value={tone} onChange={e=>setTone(e.target.value as any)}>
            <option value="friendly">friendly</option>
            <option value="formal">formal</option>
            <option value="excited">excited</option>
          </select>
          <input className="border px-2 py-1" placeholder="Variables (comma-separated)" value={variablesText} onChange={e=>setVariablesText(e.target.value)} />
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={doSuggest} disabled={suggesting}>{suggesting ? 'Suggesting…' : 'Suggest'}</button>
        </div>
        {variants.length > 0 && (
          <ul className="space-y-2">
            {variants.map((v, i) => (
              <li key={i} className="border rounded p-2 flex justify-between items-center">
                <span className="text-sm pr-2">{v}</span>
                <button className="px-2 py-1 bg-gray-700 text-white rounded" onClick={()=>setTemplate(v)}>Use</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-4 border rounded">
        <h2 className="font-medium mb-2">History</h2>
        <div className="flex items-center gap-2 mb-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select className="border px-2 py-1" value={cLimit} onChange={e=>loadCampaigns(0, Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>recent campaigns</span>
          </div>
          <span className="ml-4">Total: {campaignsTotal}</span>
          <button className="px-2 py-1 bg-gray-200 rounded" disabled={cSkip<=0} onClick={()=>loadCampaigns(Math.max(0, cSkip - cLimit), cLimit)}>Prev</button>
          <button className="px-2 py-1 bg-gray-200 rounded" disabled={cSkip + cLimit >= campaignsTotal} onClick={()=>loadCampaigns(cSkip + cLimit, cLimit)}>Next</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th>Name</th><th>Counts</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c._id} className="border-t">
                <td>{c.name}</td>
                <td>{c.counts?.sent ?? 0}/{c.counts?.total ?? 0} sent, {c.counts?.delivered ?? 0} delivered</td>
                <td>{new Date(c.createdAt).toLocaleString()}</td>
                <td className="space-x-2">
                  <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>simulateSend(c._id)}>Send</button>
                  <button className="px-2 py-1 bg-gray-700 text-white rounded" onClick={()=>loadLogs(c._id)}>Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="bg-white p-4 border rounded">
          <h2 className="font-medium mb-2">Logs</h2>
          <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
            <select className="border px-2 py-1" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">status: any</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
            </select>
            <select className="border px-2 py-1" value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}>
              <option value="">channel: any</option>
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
            </select>
            <input type="date" className="border px-2 py-1" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
            <input type="date" className="border px-2 py-1" value={toDate} onChange={e=>setToDate(e.target.value)} />
            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>loadLogs(selected, 0, lLimit)}>Apply</button>
            <span>•</span>
            <span>Total: {logsTotal}</span>
            <button className="px-2 py-1 bg-gray-200 rounded" disabled={lSkip<=0} onClick={()=>loadLogs(selected, Math.max(0, lSkip - lLimit), lLimit)}>Prev</button>
            <button className="px-2 py-1 bg-gray-200 rounded" disabled={lSkip + lLimit >= logsTotal} onClick={()=>loadLogs(selected, lSkip + lLimit, lLimit)}>Next</button>
          </div>
          <ul className="space-y-1 text-sm">
            {logs.map(l => (
              <li key={l._id} className="border rounded p-2"><span className="font-medium">{l.status}</span> — {new Date(l.createdAt).toLocaleString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
