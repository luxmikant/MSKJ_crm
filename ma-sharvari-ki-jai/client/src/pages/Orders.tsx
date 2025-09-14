import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'

type Order = { _id: string, orderTotal: number, orderDate: string, status: string }

export default function Orders() {
  const { token } = useAuth()
  const [items, setItems] = useState<Order[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(10)
  const [status, setStatus] = useState<string>('')
  const [customerId, setCustomerId] = useState<string>('')
  const [minTotal, setMinTotal] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const load = async (p = page, l = limit) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(l))
    if (status) params.set('status', status)
    if (customerId) params.set('customerId', customerId)
    if (minTotal) params.set('minTotal', minTotal)
    if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString())
  if (dateTo) params.set('dateTo', new Date(dateTo).toISOString())
    const r = await apiFetch<{items: Order[], total: number}>(`/api/orders?${params.toString()}`, {}, token)
    setItems(r.items || [])
    setTotal(r.total || 0)
    setPage(p)
    setLimit(l)
  }

  useEffect(() => { load(1, limit) }, [token])
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold mb-2">Orders</h1>
      <Card>
        <CardHeader title="Filters" actions={<Button variant="secondary" onClick={()=>load(1, limit)}>Apply</Button>} />
        <CardBody className="flex flex-wrap gap-2 text-sm items-center">
        <select className="border px-2 py-1" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">status: any</option>
          <option value="PLACED">PLACED</option>
          <option value="PAID">PAID</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <input className="border px-2 py-1" placeholder="Customer ID" value={customerId} onChange={e=>setCustomerId(e.target.value)} />
        <input type="number" className="border px-2 py-1" placeholder="Min Total" value={minTotal} onChange={e=>setMinTotal(e.target.value)} />
        <input type="date" className="border px-2 py-1" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="date" className="border px-2 py-1" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <span className="ml-auto">Total: {total}</span>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Results" />
        <CardBody>
      <table className="w-full text-sm">
        <thead><tr className="text-left"><th>Date</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((o: Order) => (
            <tr key={o._id} className="border-t"><td>{new Date(o.orderDate).toLocaleString()}</td><td>{o.orderTotal}</td><td>{o.status}</td></tr>
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
