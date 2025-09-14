import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function CustomerProfile() {
  const { id } = useParams()
  const { token } = useAuth()
  const [customer, setCustomer] = useState<any>(null)
  useEffect(() => {
    if (!id) return
    apiFetch<{ customer: any }>(`/api/customers/${id}`, {}, token).then(r => setCustomer(r.customer)).catch(console.error)
  }, [id, token])
  if (!customer) return <div>Loading…</div>
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-semibold text-blue-600">{customer.name?.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <p className="text-gray-600">{customer.email}</p>
              <div className="flex items-center space-x-3 mt-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-gray-100 capitalize">{customer.attributes?.loyaltyTier || 'standard'}</span>
                <span className="text-gray-500">LTV: ₹{(customer.totalSpend||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary">Send Email</Button>
            <Button>Log Call</Button>
          </div>
        </div>
      </div>
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Phone</div>
              <div className="font-medium">{customer.phone || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Order</div>
              <div className="font-medium">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString() : '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Visits</div>
              <div className="font-medium">{customer.visitCount || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Tags</div>
              <div className="font-medium">{(customer.tags||[]).join(', ') || '-'}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
