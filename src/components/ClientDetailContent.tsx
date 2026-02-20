'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SmallClient {
  id: string
  full_name: string
  date_of_birth: string
  age: number | null
  gender: string | null
  class: string | null
  street_address: string
  city: string
  state: string
  zip_code: string
  phone_number: string
  email_address: string
  emergency_contact_name: string
  emergency_phone: string
  primary_diagnosis: string | null
  current_medications: string | null
  allergies: string | null
  representative_1_name: string | null
  representative_1_relationship: string | null
  representative_1_phone: string | null
  representative_2_name: string | null
  representative_2_relationship: string | null
  representative_2_phone: string | null
  status: 'active' | 'inactive'
  created_at: string
}

interface ClientDetailContentProps {
  client: SmallClient
  allClients: Array<{ id: string; full_name: string }>
}

export default function ClientDetailContent({ client, allClients }: ClientDetailContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [clientStatus, setClientStatus] = useState(client.status)
  const [loginAccess, setLoginAccess] = useState(true) // This would come from a separate table/field

  // Find current client index
  const currentIndex = allClients.findIndex(c => c.id === client.id)
  const previousClient = currentIndex > 0 ? allClients[currentIndex - 1] : null
  const nextClient = currentIndex < allClients.length - 1 ? allClients[currentIndex + 1] : null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    })
  }

  const handleStatusToggle = async (newStatus: 'active' | 'inactive') => {
    setClientStatus(newStatus)
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('patients')
        .update({ status: newStatus })
        .eq('id', client.id)

      if (error) {
        console.error('Error updating status:', error)
        setClientStatus(client.status) // Revert on error
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setClientStatus(client.status) // Revert on error
    }
  }

  const handleClientChange = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handlePrevious = () => {
    if (previousClient) {
      router.push(`/dashboard/clients/${previousClient.id}`)
    }
  }

  const handleNext = () => {
    if (nextClient) {
      router.push(`/dashboard/clients/${nextClient.id}`)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'medical', label: 'Medical Info' },
    { id: 'representatives', label: 'Representatives' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'adls', label: 'ADLs' },
    { id: 'documents', label: 'Documents' },
    { id: 'incidents', label: 'Incidents' },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>

          {/* Previous/Next Navigation */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
            <button
              onClick={handlePrevious}
              disabled={!previousClient}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous client"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <select
              value={client.id}
              onChange={(e) => handleClientChange(e.target.value)}
              className="px-4 py-2 border-0 focus:ring-0 focus:outline-none bg-transparent cursor-pointer"
            >
              {allClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>

            <button
              onClick={handleNext}
              disabled={!nextClient}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next client"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Client Overview Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xl">
            {getInitials(client.full_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded ${
                clientStatus === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {clientStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
              {client.class && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  {client.class}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{client.street_address}, {client.city}, {client.state} {client.zip_code}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span><strong>Date of Birth:</strong> {formatShortDate(client.date_of_birth)} (Age {client.age || 'N/A'})</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span><strong>Gender:</strong> {client.gender || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span><strong>Phone:</strong> {client.phone_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span><strong>Email:</strong> {client.email_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span><strong>Enrolled:</strong> {formatShortDate(client.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Full Name:</span>
                    <p className="text-sm font-medium text-gray-900">{client.full_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Gender:</span>
                    <p className="text-sm font-medium text-gray-900">{client.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Date of Birth:</span>
                    <p className="text-sm font-medium text-gray-900">{formatDate(client.date_of_birth)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Age:</span>
                    <p className="text-sm font-medium text-gray-900">{client.age || 'N/A'} years</p>
                  </div>
                </div>
              </div>

              {/* Status Management Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Client Status</p>
                      <p className="text-xs text-gray-500">Set whether this client is actively receiving care</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientStatus === 'active'}
                        onChange={(e) => handleStatusToggle(e.target.checked ? 'active' : 'inactive')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Login Access</p>
                      <p className="text-xs text-gray-500">Control portal login access for this client</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loginAccess}
                        onChange={(e) => setLoginAccess(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <p className="text-sm font-medium text-gray-900">
                      {client.street_address} {client.city}, {client.state} {client.zip_code}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone Number:</span>
                    <p className="text-sm font-medium text-gray-900">{client.phone_number}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email Address:</span>
                    <p className="text-sm font-medium text-gray-900">{client.email_address}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Contact Name:</span>
                    <p className="text-sm font-medium text-gray-900">{client.emergency_contact_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone Number:</span>
                    <p className="text-sm font-medium text-gray-900">{client.emergency_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600">Primary Diagnosis:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {client.primary_diagnosis || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Current Medications:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-line">
                      {client.current_medications || 'None listed'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Allergies:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-line">
                      {client.allergies || 'None listed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'representatives' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Representatives</h3>
                <div className="space-y-4">
                  {client.representative_1_name && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Representative #1</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-900"><strong>Name:</strong> {client.representative_1_name}</p>
                        {client.representative_1_relationship && (
                          <p className="text-sm text-gray-900"><strong>Relationship:</strong> {client.representative_1_relationship}</p>
                        )}
                        {client.representative_1_phone && (
                          <p className="text-sm text-gray-900"><strong>Phone:</strong> {client.representative_1_phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {client.representative_2_name && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Representative #2</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-900"><strong>Name:</strong> {client.representative_2_name}</p>
                        {client.representative_2_relationship && (
                          <p className="text-sm text-gray-900"><strong>Relationship:</strong> {client.representative_2_relationship}</p>
                        )}
                        {client.representative_2_phone && (
                          <p className="text-sm text-gray-900"><strong>Phone:</strong> {client.representative_2_phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {!client.representative_1_name && !client.representative_2_name && (
                    <p className="text-sm text-gray-500">No representatives listed</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'schedule' || activeTab === 'adls' || activeTab === 'documents' || activeTab === 'incidents') && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">This section is coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
