import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card, { CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { 
  Users, 
  Target, 
  BarChart3, 
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  Play
} from 'lucide-react'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'

export default function Landing() {
  const navigate = useNavigate()
  const { setToken } = useAuth()

  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => {
      // Render a Sign in with Google button in the hero
      // Falls back gracefully if client id not set
      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        callback: async (response: any) => {
          try {
            const idToken = response.credential
            const data = await apiFetch<{ token?: string }>(`/api/auth/google`, {
              method: 'POST',
              body: JSON.stringify({ idToken }),
            })
            if (data?.token) {
              setToken(data.token)
              navigate('/dashboard')
            }
          } catch (e) {
            // no-op
          }
        },
      })
      // @ts-ignore
      window.google?.accounts.id.renderButton(document.getElementById('google-btn'), { theme: 'outline', size: 'large' })
    }
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [setToken])

  const features = [
    { icon: Users, title: 'Customer Segmentation', description: 'Create smart customer segments with our intuitive drag-and-drop builder' },
    { icon: Target, title: 'Campaign Builder', description: 'Design and launch targeted campaigns with visual workflow tools' },
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Track performance with real-time insights and comprehensive reports' },
    { icon: Zap, title: 'Automation', description: 'Automate your marketing workflows and save valuable time' },
  ]

  const benefits = [
    'Increase customer engagement by 40%',
    'Reduce campaign setup time by 60%',
    'Improve conversion rates with targeted messaging',
    'Scale your marketing efforts efficiently',
  ]

  const testimonials = [
    { name: 'Sarah Johnson', company: 'TechStart Inc', text: 'This CRM transformed how we manage our customer relationships. The segmentation tools are incredible!', rating: 5 },
    { name: 'Mike Chen', company: 'Growth Co', text: "The campaign builder is so intuitive. We've doubled our email engagement rates since switching.", rating: 5 },
    { name: 'Lisa Rodriguez', company: 'Scale Solutions', text: 'Best CRM for small to medium businesses. The analytics dashboard gives us insights we never had before.', rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">MSKJ CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <div id="google-btn" className="hidden sm:flex" />
            <Button variant="outline" onClick={() => navigate('/login')}>Sign In</Button>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4 bg-yellow-100 text-yellow-800">✨ New: Advanced Segmentation Tools</Badge>
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Build Better Customer<br />Relationships</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">The modern CRM that combines powerful segmentation, intuitive campaign building, and actionable insights to grow your business faster.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/login')}>
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Watch Demo
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to succeed</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Powerful tools designed to help you understand your customers better and create campaigns that convert.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Why businesses choose SMKJ CRM</h2>
              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8 bg-green-600 hover:bg-green-700" onClick={() => navigate('/login')}>
                Start Building Today
              </Button>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="bg-gradient-to-br from-blue-500 to-green-500 h-48 rounded-lg mb-4 flex items-center justify-center">
                <BarChart3 className="w-16 h-16 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Dashboard</h3>
              <p className="text-gray-600 text-sm">Monitor your campaigns, track customer behavior, and optimize performance with our comprehensive analytics dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Loved by thousands of businesses</h2>
          <p className="text-gray-600">See what our customers are saying about SMKJ CRM</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-green-600 py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your business?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of businesses using SMKJ CRM to grow faster</p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/login')} className="bg-white text-blue-600 hover:bg-gray-100">
            Get Started Free Today
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">SMKJ CRM</span>
              </div>
              <p className="text-gray-400">The modern CRM for growing businesses.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Integrations</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Community</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SMKJ CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
