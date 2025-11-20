import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { apiFetch } from '../api'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { User, Lock, Bell, Moon, Sun, Monitor } from 'lucide-react'

export default function UserProfile() {
  const { token } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: '',
    preferences: {
      theme: 'system',
      notifications: true,
      language: 'en'
    }
  })

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [token])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await apiFetch<{ user: any }>('/api/auth/me', {}, token)
      if (res.user) {
        setUser(res.user)
        setFormData({
          name: res.user.name || '',
          bio: res.user.bio || '',
          phone: res.user.phone || '',
          preferences: {
            theme: res.user.preferences?.theme || 'system',
            notifications: res.user.preferences?.notifications ?? true,
            language: res.user.preferences?.language || 'en'
          }
        })
      }
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiFetch<{ user: any }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData)
      }, token)
      setUser(res.user)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      }, token)
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading profile...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardBody className="text-center pt-8 pb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-blue-600">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
              </div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                {user?.role || 'User'}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium">General Information</h3>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us a little about yourself..."
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                      <div className="flex space-x-2">
                        {['light', 'dark', 'system'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, theme: t } })}
                            className={`p-2 rounded-md border ${formData.preferences.theme === t ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
                            title={t.charAt(0).toUpperCase() + t.slice(1)}
                          >
                            {t === 'light' && <Sun className="w-4 h-4" />}
                            {t === 'dark' && <Moon className="w-4 h-4" />}
                            {t === 'system' && <Monitor className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <Select
                        value={formData.preferences.language}
                        onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, language: e.target.value } })}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'hi', label: 'Hindi' },
                          { value: 'es', label: 'Spanish' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium">Security</h3>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required to set a new password.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="secondary" disabled={saving || !passwordData.newPassword}>
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
