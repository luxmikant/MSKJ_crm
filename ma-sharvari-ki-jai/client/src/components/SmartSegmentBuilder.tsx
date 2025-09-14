import React, { useState, useEffect } from 'react'
import Button from './ui/Button'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import { Card, CardBody, CardHeader } from './ui/Card'

type Rule = { field: string, operator: string, value: any }
type Group = { condition: 'AND'|'OR', rules: Array<Group|Rule> }

type BackendRule = { filterId: string; operator: string; value: any; label?: string }

export default function SmartSegmentBuilder({ onApply, onClose }: { onApply: (group: Group) => void, onClose: () => void }) {
  const { token } = useAuth()
  const [query, setQuery] = useState('High spenders in last 30 days')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [preview, setPreview] = useState<Group | null>(null)
  const [filters, setFilters] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch<{ filters: any[] }>('/api/segments/filters/available', {}, token)
        setFilters(r.filters || [])
      } catch (_) { /* ignore */ }
    })()
  }, [token])

  const toGroup = (rules: BackendRule[], logicBlocks?: { type: 'AND'|'OR' }[]): Group => {
    if (!rules || !rules.length) return { condition: 'AND', rules: [] }
    const mapped: Rule[] = rules.map(r => ({ field: r.filterId, operator: r.operator, value: r.value }))
    if (!logicBlocks || logicBlocks.length === 0) {
      return mapped.length === 1 ? { condition: 'AND', rules: [mapped[0]] } : { condition: 'AND', rules: mapped }
    }
    // interleave mapped with logicBlocks
    let group: Group = { condition: logicBlocks[0]?.type || 'AND', rules: [] }
    group.rules.push(mapped[0])
    for (let i=1;i<mapped.length;i++) {
      const op = logicBlocks[i-1]?.type || 'AND'
      if (group.condition !== op) {
        group = { condition: op, rules: [group, mapped[i]] }
      } else {
        group.rules.push(mapped[i])
      }
    }
    return group
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await apiFetch<{ rules: BackendRule[], logicBlocks?: { type: 'AND'|'OR' }[], hint?: string }>(
        '/api/segments/ai/generate',
        { method: 'POST', body: JSON.stringify({ query }) },
        token
      )
      const g = toGroup(r.rules || [], r.logicBlocks)
      setPreview(g)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate rules')
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    if (preview) onApply(preview)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl">
        <Card>
          <CardHeader title="Smart Segment Builder" actions={<Button variant="ghost" onClick={onClose}>Close</Button>} />
          <CardBody className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Describe your audience</label>
              <textarea className="border rounded w-full p-2 h-24" value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. Customers who spent over 5000 in the last 60 days" />
            </div>

            {filters.length > 0 && (
              <div className="text-xs text-gray-500">
                Available fields: {filters.map(f=>f.id).join(', ')}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate rules'}</Button>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {preview && (
              <div className="mt-2 p-3 border rounded bg-gray-50 text-sm">
                <div className="font-medium mb-1">Preview Rules</div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="primary" onClick={apply} disabled={!preview}>Use These Rules</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
