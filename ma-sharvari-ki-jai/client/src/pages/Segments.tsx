import React, { useState, ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import { useEffect } from 'react'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import SmartSegmentBuilder from '../components/SmartSegmentBuilder'
import DragSegmentBuilder from '../components/DragSegmentBuilder'

type Rule = { field: string, operator: string, value: any }
type Group = { condition: 'AND'|'OR', rules: Array<Group|Rule> }

function RuleRow({ rule, onChange, onRemove }: { rule: Rule; onChange: (r: Rule) => void; onRemove: () => void }) {
  const isNumberOp = (op: string) => op === '>' || op === '>=' || op === '<' || op === '<=' || op === 'in_last_days' || op === 'older_than_days'
  const isDateOp = (op: string) => false // reserved if we add explicit date comparisons later
  const isListOp = (op: string) => op === 'in' || op === 'not_in'
  return (
    <div className="flex gap-2 items-center">
  <input list="segment-fields" className="border px-2 py-1" placeholder="field" value={rule.field} onChange={(e: ChangeEvent<HTMLInputElement>)=>onChange({...rule, field: e.target.value})} />
  <select className="border px-2 py-1" value={rule.operator} onChange={(e: ChangeEvent<HTMLSelectElement>)=>onChange({...rule, operator: e.target.value})}>
        <option value=">">&gt;</option>
        <option value=">=">&gt;=</option>
        <option value="<">&lt;</option>
        <option value="<=">&lt;=</option>
        <option value="eq">eq</option>
        <option value="!=">!=</option>
        <option value="in">in</option>
        <option value="not_in">not_in</option>
        <option value="contains">contains</option>
        <option value="starts_with">starts_with</option>
        <option value="ends_with">ends_with</option>
        <option value="in_last_days">in_last_days</option>
        <option value="older_than_days">older_than_days</option>
      </select>
  {isListOp(rule.operator) ? (
    <input className="border px-2 py-1" placeholder="comma,separated,values" value={rule.value ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>)=>onChange({...rule, value: e.target.value})} />
  ) : isDateOp(rule.operator) ? (
    <input type="date" className="border px-2 py-1" value={rule.value ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>)=>onChange({...rule, value: e.target.value})} />
  ) : isNumberOp(rule.operator) ? (
    <input type="number" className="border px-2 py-1" placeholder="0" value={rule.value ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>)=>onChange({...rule, value: e.target.value})} />
  ) : (
    <input className="border px-2 py-1" placeholder="value" value={rule.value ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>)=>onChange({...rule, value: e.target.value})} />
  )}
      <button className="text-red-600" onClick={onRemove}>Remove</button>
    </div>
  )
}

export default function Segments() {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [segments, setSegments] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string>('')
  const [group, setGroup] = useState<Group>({ condition: 'AND', rules: [ { field: 'totalSpend', operator: '>', value: 10000 } as Rule ] })
  const [preview, setPreview] = useState<{ audienceSize: number, sample: any[] } | null>(null)
  const [showSmart, setShowSmart] = useState(false)
  const [showVisual, setShowVisual] = useState(false)

  const addRule = () => setGroup((g: Group) => ({...g, rules: [...g.rules, { field: '', operator: 'eq', value: '' } as Rule]}))
  const updateRule = (idx: number, r: Rule) => setGroup((g: Group) => ({...g, rules: g.rules.map((it,i)=> i===idx ? (r as any as Group | Rule) : it)}))
  const removeRule = (idx: number) => setGroup((g: Group) => ({...g, rules: g.rules.filter((_,i)=>i!==idx)}))

  const doPreview = async () => {
    const res = await apiFetch<{ audienceSize: number, sample: any[] }>('/api/segments/preview', {
      method: 'POST', body: JSON.stringify({ rules: group, sample: 5 })
    }, token)
    setPreview(res)
  }

  const doSave = async () => {
    if (!name) { alert('Name is required'); return }
    if (editingId) {
      await apiFetch(`/api/segments/${editingId}`, { method: 'PUT', body: JSON.stringify({ name, rules: group }) }, token)
      alert('Segment updated')
    } else {
      await apiFetch('/api/segments', { method: 'POST', body: JSON.stringify({ name, rules: group }) }, token)
      alert('Segment saved')
    }
    setEditingId('')
    setPreview(null)
    await loadList()
  }

  const loadList = async () => {
    const r = await apiFetch<{ items: any[] }>('/api/segments', {}, token)
    setSegments(r.items || [])
  }

  const editSeg = async (id: string) => {
    const r = await apiFetch<{ segment: any }>(`/api/segments/${id}`, {}, token)
    const seg = r.segment
    setEditingId(seg._id)
    setName(seg.name || '')
    setGroup(seg.rules as Group)
    setPreview(null)
  }

  const delSeg = async (id: string) => {
    if (!confirm('Delete this segment?')) return
    await apiFetch(`/api/segments/${id}`, { method: 'DELETE' }, token)
    if (editingId === id) { setEditingId(''); setName(''); setGroup({ condition: 'AND', rules: [] }) }
    await loadList()
  }

  const newSeg = () => {
    setEditingId('')
    setName('')
    setGroup({ condition: 'AND', rules: [] })
    setPreview(null)
  }

  useEffect(() => { loadList() }, [token])
  return (
    <div className="space-y-4">
      <datalist id="segment-fields">
        <option value="totalSpend" />
        <option value="visitCount" />
        <option value="lastOrderDate" />
        <option value="tags" />
        <option value="attributes.loyaltyTier" />
      </datalist>
      <h1 className="text-2xl font-semibold">Segments</h1>

      <Card>
        <CardHeader title={editingId ? 'Edit Segment' : 'New Segment'} actions={<Button variant="secondary" onClick={newSeg}>New</Button>} />
        <CardBody className="space-y-3">
          <input className="border px-3 py-2 rounded w-full" placeholder="Segment name" value={name} onChange={e=>setName(e.target.value)} />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-medium">Condition</span>
              <select className="border px-2 py-1 rounded" value={group.condition} onChange={e=>setGroup(g=>({...g, condition: e.target.value as any}))}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
              {editingId ? <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Editing</span> : null}
              <span className="ml-auto" />
              <Button variant="secondary" onClick={()=>setShowSmart(true)}>⚡ Smart Builder</Button>
              <Button variant="secondary" onClick={()=>setShowVisual(true)}>🎛️ Visual Builder</Button>
            </div>
            <div className="space-y-2">
              {group.rules.map((r, i) => (
                <RuleRow key={i} rule={r as Rule} onChange={(nr: Rule)=>updateRule(i, nr)} onRemove={()=>removeRule(i)} />
              ))}
            </div>
            <Button variant="secondary" onClick={addRule}>Add Rule</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={doPreview}>Preview</Button>
            <Button variant="primary" onClick={doSave}>Save</Button>
          </div>
        </CardBody>
      </Card>

      {preview && (
        <Card>
          <CardHeader title="Preview" />
          <CardBody>
            <div className="font-medium">Audience Size: {preview.audienceSize}</div>
            <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(preview.sample, null, 2)}</pre>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Your Segments" />
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left"><th className="py-2">Name</th><th>Audience</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {segments.map(s => (
                <tr key={s._id} className="border-t">
                  <td className="py-2">{s.name}</td>
                  <td>{s.audienceSize ?? '-'}</td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
                  <td className="space-x-2">
                    <Button variant="primary" onClick={()=>editSeg(s._id)}>Edit</Button>
                    <Button variant="danger" onClick={()=>delSeg(s._id)}>Delete</Button>
                    <Link to={`/campaigns?segmentId=${s._id}`} className="inline-block">
                      <Button variant="secondary" className="!inline-flex">Create Campaign</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {showSmart && (
        <SmartSegmentBuilder
          onApply={(g)=>{ setGroup(g); setShowSmart(false); }}
          onClose={()=>setShowSmart(false)}
        />
      )}

      {showVisual && (
        <DragSegmentBuilder
          initial={group}
          onApply={(g)=>{ setGroup(g); setShowVisual(false); }}
          onClose={()=>setShowVisual(false)}
        />
      )}
    </div>
  )
}
