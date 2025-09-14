import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import Card, { CardBody, CardHeader } from '../components/ui/Card'

interface Segment {
  _id: string
  name: string
  description?: string
  audienceSize?: number
}
import Button from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Textarea } from '../components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Switch } from '../components/ui/Switch'
import { Progress } from '../components/ui/Progress'
import { Separator } from '../components/ui/Separator'

const steps = [
  { id: 1, title: 'Audience', description: 'Select your target segment' },
  { id: 2, title: 'Creative', description: 'Design your message' },
  { id: 3, title: 'Schedule', description: 'Set delivery timing' },
  { id: 4, title: 'Review', description: 'Review and send' },
]

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject?: string
  preheader?: string
  content?: string
  variables?: string[]
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <Card className="mb-8">
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isCompleted
                        ? 'bg-green-100 text-green-600 border-green-300'
                        : 'bg-gray-100 text-gray-400 border-gray-300'
                    }`}
                  >
                    {step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-4 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4">
          <Progress value={(currentStep / steps.length) * 100} />
        </div>
      </CardBody>
    </Card>
  )
}

function AudienceStep({ campaign, setCampaign, segments }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-lg font-semibold">Select Target Audience</div>
          <div className="text-gray-500">Choose which customer segment will receive this campaign</div>
        </div>
        <CardBody>
          <div className="grid gap-4">
            {segments.map((segment: any) => (
              <div
                key={segment._id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  campaign.segmentId === segment._id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setCampaign({ ...campaign, segmentId: segment._id, segmentName: segment.name })}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{segment.name}</h4>
                    <p className="text-sm text-gray-500">{segment.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {segment.audienceSize?.toLocaleString() || '0'} customers
                    </Badge>
                    <p className="text-sm text-gray-400 mt-1">
                      Est. reach: {Math.floor((segment.audienceSize || 0) * 0.85).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {campaign.segmentId && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="text-lg font-semibold">Campaign Details</div>
          </div>
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <Input
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Textarea
                  value={campaign.description}
                  onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                  placeholder="Brief description of this campaign"
                  rows={2}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function CreativeStep({ campaign, setCampaign, templates, loadTemplateDetails, token }: any) {
  const [mode, setMode] = useState<'manual' | 'ai'>(campaign.aiMode || 'manual')
  const [scenario, setScenario] = useState('Announce 10% discount for VIP customers this weekend.')
  const [tone, setTone] = useState<'friendly'|'formal'|'excited'>('friendly')
  const [length, setLength] = useState<'short'|'medium'|'long'>('medium')
  const [variables, setVariables] = useState<string>('name')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setCampaign({ ...campaign, aiMode: mode })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const doGenerate = async () => {
    setGenerating(true)
    try {
      const vars = variables.split(',').map(v => v.trim()).filter(Boolean)
      const res = await apiFetch<{subject: string, preheader: string, content: string}>(
        '/api/ai/generate-email',
        { method: 'POST', body: JSON.stringify({ scenario, tone, variables: vars, length, brand: 'MSKJ', channel: campaign.channel }) },
        token
      )
      setCampaign({ ...campaign, subject: res.subject || campaign.subject, preheader: res.preheader || campaign.preheader, content: res.content || campaign.content })
    } catch (e: any) {
      alert(e?.message || 'Failed to generate email with AI')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-lg font-semibold">Choose Email Template</div>
          <div className="text-gray-500">Select a pre-built template, or switch to AI</div>
        </div>
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Button variant={mode === 'manual' ? 'primary' : 'secondary'} onClick={() => setMode('manual')}>✍️ Manual</Button>
            <Button variant={mode === 'ai' ? 'primary' : 'secondary'} onClick={() => setMode('ai')}>🤖 Build with AI</Button>
          </div>
          {mode === 'manual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template: EmailTemplate) => (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    campaign.template === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => loadTemplateDetails(template.id)}
                >
                  <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
                    <span className="text-gray-400">📧</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="outline" className="mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mode === 'ai' && (
            <div className="space-y-4 p-4 rounded border bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-2">Describe the scenario</label>
                <Textarea rows={4} value={scenario} onChange={(e)=>setScenario(e.target.value)} placeholder="Describe the message you want to send" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <Select value={tone} onValueChange={(v)=>setTone(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="excited">Excited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Length</label>
                  <Select value={length} onValueChange={(v)=>setLength(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Variables</label>
                  <Input value={variables} onChange={(e)=>setVariables(e.target.value)} placeholder="e.g. name, last_order" />
                </div>
              </div>
              <div>
                <Button onClick={doGenerate} disabled={generating}>
                  {generating ? 'Generating…' : 'Generate Email' }
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-lg font-semibold">Email Content</div>
          <div className="text-gray-500">Customize your message content and settings</div>
        </div>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Line</label>
              <Input
                value={campaign.subject}
                onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                placeholder="Enter email subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Preheader Text</label>
              <Input
                value={campaign.preheader}
                onChange={(e) => setCampaign({ ...campaign, preheader: e.target.value })}
                placeholder="Preview text that appears after subject line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Channel</label>
              <Select value={campaign.channel} onValueChange={(value) => setCampaign({ ...campaign, channel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Content</label>
              <Textarea
                value={campaign.content}
                onChange={(e) => setCampaign({ ...campaign, content: e.target.value })}
                placeholder="Write your email content here..."
                rows={8}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Tracking Settings</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Track Email Opens</p>
                  <p className="text-sm text-gray-500">Monitor when recipients open your email</p>
                </div>
                <Switch
                  checked={campaign.trackOpens}
                  onCheckedChange={(checked) => setCampaign({ ...campaign, trackOpens: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Track Link Clicks</p>
                  <p className="text-sm text-gray-500">Monitor when recipients click links</p>
                </div>
                <Switch
                  checked={campaign.trackClicks}
                  onCheckedChange={(checked) => setCampaign({ ...campaign, trackClicks: checked })}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ScheduleStep({ campaign, setCampaign }: any) {
  return (
    <Card>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="text-lg font-semibold">Schedule Delivery</div>
        <div className="text-gray-500">Choose when to send your campaign</div>
      </div>
      <CardBody>
        <div className="space-y-6">
          <div className="grid gap-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                campaign.scheduleType === 'now'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setCampaign({ ...campaign, scheduleType: 'now', status: 'running' })}
            >
              <div className="flex items-center gap-3">
                <span className="text-green-600">🚀</span>
                <div>
                  <h4 className="font-medium">Send Immediately</h4>
                  <p className="text-sm text-gray-500">Campaign will be sent as soon as you confirm</p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                campaign.scheduleType === 'scheduled'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setCampaign({ ...campaign, scheduleType: 'scheduled', status: 'scheduled' })}
            >
              <div className="flex items-center gap-3">
                <span className="text-blue-600">📅</span>
                <div>
                  <h4 className="font-medium">Schedule for Later</h4>
                  <p className="text-sm text-gray-500">Choose a specific date and time</p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                campaign.scheduleType === 'draft'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setCampaign({ ...campaign, scheduleType: 'draft', status: 'draft' })}
            >
              <div className="flex items-center gap-3">
                <span className="text-purple-600">💾</span>
                <div>
                  <h4 className="font-medium">Save as Draft</h4>
                  <p className="text-sm text-gray-500">Save for later editing and sending</p>
                </div>
              </div>
            </div>
          </div>

          {campaign.scheduleType === 'scheduled' && (
            <div className="space-y-4 p-4 rounded-lg bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={campaign.scheduleDate}
                    onChange={(e) => setCampaign({ ...campaign, scheduleDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Input
                    type="time"
                    value={campaign.scheduleTime}
                    onChange={(e) => setCampaign({ ...campaign, scheduleTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <label className="block text-sm font-medium mb-2">Priority Level</label>
            <Select
              value={campaign.priority}
              onValueChange={(value) => setCampaign({ ...campaign, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Send when server load is light</SelectItem>
                <SelectItem value="normal">Normal - Standard delivery speed</SelectItem>
                <SelectItem value="high">High - Prioritize this campaign</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function ReviewStep({ campaign, segments, templates }: any) {
  const selectedSegment = segments.find((s: any) => s._id === campaign.segmentId)
  const selectedTemplate = templates.find((t: EmailTemplate) => t.id === campaign.template)

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-lg font-semibold">Campaign Summary</div>
          <div className="text-gray-500">Review your campaign details before sending</div>
        </div>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-500">CAMPAIGN NAME</h4>
                <p>{campaign.name}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">TARGET AUDIENCE</h4>
                <p>{selectedSegment?.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedSegment?.audienceSize?.toLocaleString() || '0'} customers
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">EMAIL TEMPLATE</h4>
                <p>{selectedTemplate?.name}</p>
                <Badge variant="outline">{selectedTemplate?.category}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-500">SUBJECT LINE</h4>
                <p>{campaign.subject}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">CHANNEL</h4>
                <p>{campaign.channel}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">SCHEDULE</h4>
                <p>
                  {campaign.scheduleType === 'now' && 'Send immediately'}
                  {campaign.scheduleType === 'scheduled' && campaign.scheduleDate && 
                    `${campaign.scheduleDate} at ${campaign.scheduleTime || '09:00'}`}
                  {campaign.scheduleType === 'draft' && 'Save as draft'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">TRACKING</h4>
                <div className="flex gap-2">
                  {campaign.trackOpens && <Badge variant="secondary">Opens</Badge>}
                  {campaign.trackClicks && <Badge variant="secondary">Clicks</Badge>}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-lg font-semibold">Content Preview</div>
        </div>
        <CardBody>
          <div className="p-4 rounded-lg border bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Channel:</span>
                <span>{campaign.channel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subject:</span>
                <span className="font-medium">{campaign.subject}</span>
              </div>
              {campaign.preheader && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Preheader:</span>
                  <span className="text-gray-500">{campaign.preheader}</span>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="bg-white p-4 rounded text-sm min-h-[100px]">
              {campaign.content || 'Content will appear here...'}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardBody className="p-6">
          <div className="flex items-center gap-4">
            <div className="text-2xl">🎯</div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Ready to {campaign.scheduleType === 'draft' ? 'Save' : 'Send'}!</h4>
              <p className="text-sm text-green-700">
                Your campaign is configured and ready to be {campaign.scheduleType === 'draft' ? 'saved' : 'sent'} to{' '}
                {selectedSegment?.audienceSize?.toLocaleString() || '0'} customers.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export function CampaignBuilder() {
  const { token } = useAuth()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [segments, setSegments] = useState<Segment[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    segmentId: '',
    segmentName: '',
    subject: '',
    preheader: '',
    content: '',
    template: '',
    channel: 'EMAIL',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: '09:00',
    priority: 'normal',
    status: 'draft',
    trackOpens: true,
    trackClicks: true,
    aiMode: 'manual',
  })

  useEffect(() => {
    loadSegments()
    loadTemplates()
    const params = new URLSearchParams(location.search)
    const mode = params.get('mode')
    if (mode === 'ai') {
      setCampaign((c) => ({ ...c, aiMode: 'ai' }))
    }
    const restoreId = params.get('restore')
    if (restoreId) {
      ;(async () => {
        try {
          const existing = await apiFetch<any>(`/api/campaigns/${restoreId}`, {}, token)
          setCampaign((c) => ({
            ...c,
            name: existing.name || c.name,
            description: existing.description || c.description,
            segmentId: existing.segmentId || c.segmentId,
            subject: existing.subject || c.subject,
            preheader: existing.preheader || c.preheader,
            content: existing.template || c.content,
            template: '',
            channel: existing.channel || c.channel,
            scheduleType: existing.scheduleType || 'draft',
            scheduleDate: existing.scheduleDate ? new Date(existing.scheduleDate).toISOString().slice(0,10) : c.scheduleDate,
            scheduleTime: existing.scheduleTime || c.scheduleTime,
            priority: existing.priority || c.priority,
            status: 'draft',
            trackOpens: existing.trackOpens ?? c.trackOpens,
            trackClicks: existing.trackClicks ?? c.trackClicks,
          }))
        } catch (e) {
          console.error('Failed to restore draft', e)
        }
      })()
    }
  }, [token, location.search])

  const loadSegments = async () => {
    try {
      const response = await apiFetch<{items: any[]}>('/api/segments', {}, token)
      setSegments(response.items || [])
    } catch (error) {
      console.error('Failed to load segments:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await apiFetch<{templates: EmailTemplate[]}>('/api/templates', {}, token)
      setTemplates(response.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadTemplateDetails = async (templateId: string) => {
    try {
      const template = await apiFetch<EmailTemplate>(`/api/templates/${templateId}`, {}, token)
      setCampaign({ 
        ...campaign, 
        template: template.id,
        subject: template.subject || campaign.subject,
        preheader: template.preheader || campaign.preheader,
        content: template.content || campaign.content
      })
    } catch (error) {
      console.error('Failed to load template details:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSendCampaign = async () => {
    setLoading(true)
    try {
      const payload = {
        name: campaign.name,
        segmentId: campaign.segmentId,
        channel: campaign.channel,
        template: campaign.content, // Using content as template for now
        status: campaign.status,
        description: campaign.description,
        subject: campaign.subject,
        preheader: campaign.preheader,
        scheduleType: campaign.scheduleType,
        scheduleDate: campaign.scheduleDate,
        scheduleTime: campaign.scheduleTime,
        priority: campaign.priority,
        trackOpens: campaign.trackOpens,
        trackClicks: campaign.trackClicks,
      }
      
      await apiFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token)
      
      alert(`Campaign ${campaign.scheduleType === 'draft' ? 'saved' : 'created'} successfully!`)
    } catch (error) {
      console.error('Failed to create campaign:', error)
      alert('Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return campaign.segmentId && campaign.name
      case 2:
        return !!(campaign.subject && (campaign.content || campaign.template) && campaign.channel)
      case 3:
        return campaign.scheduleType
      case 4:
        return true
      default:
        return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <AudienceStep campaign={campaign} setCampaign={setCampaign} segments={segments} />
      case 2:
        return <CreativeStep campaign={campaign} setCampaign={setCampaign} templates={templates} loadTemplateDetails={loadTemplateDetails} token={token} />
      case 3:
        return <ScheduleStep campaign={campaign} setCampaign={setCampaign} />
      case 4:
        return <ReviewStep campaign={campaign} segments={segments} templates={templates} />
      default:
        return null
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Campaign Builder</h1>
        <p className="text-gray-500">
          Create and schedule email campaigns for your customer segments
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      <div className="mb-8">
        {renderStepContent()}
      </div>

      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button variant="secondary" onClick={handlePrevious}>
                  ← Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={!canGoNext()}>
                  Next →
                </Button>
              ) : (
                <Button onClick={handleSendCampaign} disabled={!canGoNext() || loading}>
                  {loading ? 'Processing...' : 
                   campaign.scheduleType === 'now' ? '🚀 Send Now' : 
                   campaign.scheduleType === 'draft' ? '💾 Save Draft' : '📅 Schedule Campaign'}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}