import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

type Customer = { _id: string, name: string, email: string, totalSpend?: number, visitCount?: number }

export default function Customers() {
  const { token } = useAuth()
  const [items, setItems] = useState<Customer[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(10)
  const [q, setQ] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [minSpend, setMinSpend] = useState<string>('')
  const [maxSpend, setMaxSpend] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const load = async (p = page, l = limit) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(l))
    if (q) params.set('q', q)
    if (email) params.set('email', email)
    if (tags) params.set('tags', tags)
    if (minSpend) params.set('minSpend', minSpend)
    if (maxSpend) params.set('maxSpend', maxSpend)
    if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString())
    if (dateTo) params.set('dateTo', new Date(dateTo).toISOString())
    const r = await apiFetch<{items: Customer[], total: number}>(`/api/customers?${params.toString()}`, {}, token)
    setItems(r.items || [])
    setTotal(r.total || 0)
    setPage(p)
    setLimit(l)
  }

  useEffect(() => { load(1, limit) }, [token])
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <Card>
        <CardHeader title="Filters" actions={<Button variant="secondary" onClick={()=>load(1, limit)}>Apply</Button>} />
        <CardBody className="flex flex-wrap gap-2 text-sm items-center">
        <input className="border px-2 py-1" placeholder="Search (name/email)" value={q} onChange={e=>setQ(e.target.value)} />
        <input className="border px-2 py-1" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border px-2 py-1" placeholder="Tags (comma)" value={tags} onChange={e=>setTags(e.target.value)} />
        <input type="number" className="border px-2 py-1" placeholder="Min Spend" value={minSpend} onChange={e=>setMinSpend(e.target.value)} />
        <input type="number" className="border px-2 py-1" placeholder="Max Spend" value={maxSpend} onChange={e=>setMaxSpend(e.target.value)} />
        <input type="date" className="border px-2 py-1" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="date" className="border px-2 py-1" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <span className="ml-auto">Total: {total}</span>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Results" />
        <CardBody>
      <table className="w-full text-sm">
        <thead><tr className="text-left"><th>Name</th><th>Email</th><th>Spend</th><th>Visits</th><th /></tr></thead>
        <tbody>
          {items.map((c: Customer) => (
            <tr key={c._id} className="border-t"><td>{c.name}</td><td>{c.email}</td><td>{c.totalSpend ?? 0}</td><td>{c.visitCount ?? 0}</td><td><Link className="text-blue-600" to={`/customers/${c._id}`}>View</Link></td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <Button variant="secondary" disabled={page<=1} onClick={()=>load(page-1, limit)}>Prev</Button>
        <Button variant="secondary" disabled={page*limit>=total} onClick={()=>load(page+1, limit)}>Next</Button>
      </div>
        </CardBody>
      </Card>
    </div>
  )
}
