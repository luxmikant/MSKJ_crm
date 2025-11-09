import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { apiFetch, API_BASE } from '../api'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react'

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
  
  // CSV Import/Export states
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [exporting, setExporting] = useState(false)

  const buildQueryString = () => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (q) params.set('q', q)
    if (email) params.set('email', email)
    if (tags) params.set('tags', tags)
    if (minSpend) params.set('minSpend', minSpend)
    if (maxSpend) params.set('maxSpend', maxSpend)
    if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString())
    if (dateTo) params.set('dateTo', new Date(dateTo).toISOString())
    return params.toString()
  }

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/api/customers/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${result.upserted || 0} new customers and updated ${result.modified || 0} existing customers.`,
          details: result,
        })
        load(1, limit) // Reload customer list
      } else {
        setUploadResult({
          success: false,
          message: result.error?.message || 'Import failed',
          details: result.details,
        })
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: error.message || 'Network error during import',
      })
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const queryString = buildQueryString()
      const url = `${API_BASE}/api/customers/export?${queryString}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'customers-export.csv'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(`Export failed: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => { load(1, limit) }, [token])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <div className="flex gap-2">
          <label className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
              disabled={uploading}
            />
            <Button variant="outline" disabled={uploading} className="cursor-pointer">
              <Upload size={16} />
              {uploading ? 'Importing...' : 'Import CSV'}
            </Button>
          </label>
          <Button variant="primary" onClick={handleExport} disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {uploadResult && (
        <Card>
          <CardBody className={`flex items-start gap-2 ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {uploadResult.success ? (
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {uploadResult.message}
              </p>
              {uploadResult.details && Array.isArray(uploadResult.details) && (
                <ul className="mt-1 text-sm list-disc list-inside">
                  {uploadResult.details.slice(0, 5).map((detail: any, idx: number) => (
                    <li key={idx}>{detail.path}: {detail.msg}</li>
                  ))}
                  {uploadResult.details.length > 5 && (
                    <li>...and {uploadResult.details.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
            <button
              onClick={() => setUploadResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </CardBody>
        </Card>
      )}

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
