import React, { useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from './ui/Card'
import Button from './ui/Button'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'

type Rule = { field: string, operator: string, value: any }
type Group = { condition: 'AND'|'OR', rules: Array<Group|Rule> }

type Available = { id: string; label: string; type: 'select'|'number'|'date'|'text'; options?: string[]; operators?: string[] }

const DEFAULT_FILTERS: Available[] = [
  { id: 'tier', label: 'Customer Tier', type: 'select', options: ['Premium', 'Standard', 'Basic'] },
  { id: 'totalSpend', label: 'Total Spent', type: 'number', operators: ['>', '<', '>=', '<=', '=', '!='] },
  { id: 'lastOrderDate', label: 'Last Purchase', type: 'date', operators: ['before', 'after', 'in_last_days', 'older_than_days'] },
  { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { id: 'location', label: 'Location', type: 'text', operators: ['contains', 'equals'] },
  { id: 'age', label: 'Age', type: 'number', operators: ['>', '<', '>=', '<=', '=', '!='] },
]

function useDnD(onDropFilter: (f: Available) => void) {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, data: Available) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
  }
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    try {
      const json = e.dataTransfer.getData('application/json')
      const data = JSON.parse(json) as Available
      onDropFilter(data)
    } catch {}
  }
  return { onDragStart, onDragOver, onDrop }
}

function RuleRow({ rule, filter, onChange, onRemove }: { rule: Rule; filter: Available; onChange: (r: Rule)=>void; onRemove: ()=>void }) {
  const ops = filter.operators || ['=', '!=', '>', '>=', '<', '<=']
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-white">
      <Badge variant="secondary">{filter.label}</Badge>
      <Select value={rule.operator} onValueChange={(v)=>onChange({ ...rule, operator: v })}>
        <SelectTrigger className="w-32"><SelectValue placeholder="op" /></SelectTrigger>
        <SelectContent>
          {ops.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
        </SelectContent>
      </Select>
      {filter.type === 'select' ? (
        <Select value={String(rule.value ?? '')} onValueChange={(v)=>onChange({ ...rule, value: v })}>
          <SelectTrigger className="w-40"><SelectValue placeholder="value" /></SelectTrigger>
          <SelectContent>
            {(filter.options || []).map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
          </SelectContent>
        </Select>
      ) : (
        <Input className="w-40" type={filter.type === 'number' ? 'number' : 'text'} value={rule.value ?? ''} onChange={(e)=>onChange({ ...rule, value: e.target.value })} placeholder="value" />
      )}
      <Button variant="ghost" onClick={onRemove}>Remove</Button>
    </div>
  )
}

function LogicToggle({ value, onChange, onRemove }: { value: 'AND'|'OR'; onChange: (v:'AND'|'OR')=>void; onRemove: ()=>void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-full border bg-gray-50">
      <button className={`px-2 py-1 rounded text-xs ${value==='AND'?'bg-blue-600 text-white':'hover:bg-gray-100'}`} onClick={()=>onChange('AND')}>AND</button>
      <button className={`px-2 py-1 rounded text-xs ${value==='OR'?'bg-blue-600 text-white':'hover:bg-gray-100'}`} onClick={()=>onChange('OR')}>OR</button>
      <button className="text-xs text-gray-600" onClick={onRemove}>×</button>
    </div>
  )
}

export default function DragSegmentBuilder({ initial, onApply, onClose, filters }: { initial?: Group; onApply: (g: Group)=>void; onClose: ()=>void; filters?: Available[] }) {
  const available = filters && filters.length ? filters : DEFAULT_FILTERS
  const [linear, setLinear] = useState<{ kind: 'rule'|'logic'; rule?: Rule; logic?: 'AND'|'OR' }[]>(() => {
    // Convert initial Group -> linear sequence [rule, logic, rule, ...]
    function flatten(node: Group|Rule|undefined): any[] {
      if (!node) return []
      if ((node as Group).condition) {
        const g = node as Group
        if (!g.rules.length) return []
        const out: any[] = []
        out.push(...flatten(g.rules[0] as any))
        for (let i=1;i<g.rules.length;i++) {
          out.push({ kind:'logic', logic: g.condition as any })
          out.push(...flatten(g.rules[i] as any))
        }
        return out
      }
      return [{ kind:'rule', rule: node as Rule }]
    }
    return flatten(initial || { condition:'AND', rules: [] }) as any
  })

  const { onDragStart, onDragOver, onDrop } = useDnD((f)=>{
    const firstOp = (f.operators && f.operators[0]) || '='
    const firstVal = f.type === 'select' ? (f.options?.[0] || '') : ''
    setLinear(prev => [...prev, { kind:'rule', rule: { field: f.id, operator: firstOp, value: firstVal } }])
  })

  const addLogic = () => {
    const last = linear[linear.length-1]
    if (!last || last.kind !== 'rule') return
    setLinear(prev => [...prev, { kind:'logic', logic: 'AND' }])
  }

  const toGroup = (): Group => {
    const items = linear
    if (!items.length) return { condition:'AND', rules: [] }
    // ensure it starts with rule
    const normalized = items[0]?.kind === 'rule' ? items : items.slice(1)
    const rules: any[] = []
    let currentOp: 'AND'|'OR' = 'AND'
    for (let i=0;i<normalized.length;i++) {
      const item = normalized[i]
      if (item.kind === 'logic') currentOp = (item.logic || 'AND')
      else if (item.kind === 'rule') rules.push(item.rule!)
    }
    if (rules.length <= 1) return { condition: 'AND', rules }
    return { condition: currentOp, rules }
  }

  const palette = (
    <Card>
      <CardHeader title="Available Filters" />
      <CardBody>
        <div className="text-sm text-gray-500 mb-2">Drag filters to the canvas to build your segment</div>
        <div className="grid grid-cols-1 gap-2">
          {available.map(f => (
            <div key={f.id} draggable onDragStart={(e)=>onDragStart(e, f)} className="p-3 rounded-lg border bg-white cursor-move flex items-center justify-between">
              <span className="font-medium">{f.label}</span>
              <Badge variant="outline" className="text-xs">{f.type}</Badge>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )

  const canvas = (
    <Card>
      <CardHeader title="Segment Rules" actions={<Button variant="secondary" onClick={addLogic}>Add Logic</Button>} />
      <CardBody>
        <div className="text-sm text-gray-500 mb-2">Combine rules with AND/OR</div>
        <div onDragOver={onDragOver} onDrop={onDrop} className="min-h-48 p-4 border-2 border-dashed rounded-lg bg-gray-50 space-y-3">
          {!linear.length && <div className="text-gray-500 text-sm">Drag filters here…</div>}
          {linear.map((item, idx) => (
            item.kind === 'rule' ? (
              <RuleRow key={idx}
                rule={item.rule!}
                filter={available.find(a=>a.id===item.rule!.field) || DEFAULT_FILTERS[0]}
                onChange={(r)=>setLinear(list=>list.map((x,i)=> i===idx ? { kind:'rule', rule:r } : x))}
                onRemove={()=>setLinear(list=>list.filter((_,i)=>i!==idx))}
              />
            ) : (
              <LogicToggle key={idx}
                value={item.logic || 'AND'}
                onChange={(v)=>setLinear(list=>list.map((x,i)=> i===idx ? { kind:'logic', logic: v } : x))}
                onRemove={()=>setLinear(list=>list.filter((_,i)=>i!==idx))}
              />
            )
          ))}
        </div>
      </CardBody>
    </Card>
  )

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Visual Segment Builder</div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={()=>onApply(toGroup())}>Apply</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>{palette}</div>
          <div className="md:col-span-2">{canvas}</div>
        </div>
      </div>
    </div>
  )
}
