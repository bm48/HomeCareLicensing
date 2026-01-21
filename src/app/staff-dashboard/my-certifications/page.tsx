'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StaffLayout from '@/components/StaffLayout'
import AddCertificationModal from '@/components/AddCertificationModal'
import EditCertificationModal from '@/components/EditCertificationModal'
import { getCertifications, getCertificationTypes } from '@/app/actions/certifications'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Eye, Award, Loader2 } from 'lucide-react'



interface Certification {
  id: string
  type: string
  license_number: string
  state: string | null
  issue_date: string | null
  expiration_date: string
  issuing_authority: string
  status: string
  document_url: string | null
  created_at: string
  updated_at: string
}

function MyCertificationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationTypes, setCertificationTypes] = useState<Array<{ id: number; certification_type: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null)
  const [loadingCertificationId, setLoadingCertificationId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (action === 'add') {
      setIsModalOpen(true)
    }
  }, [action])

  const loadData = useCallback( async () => {
    
    try {
      const supabase = createClient()
      
      // Get user session
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      // Get user profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      setProfile(profileData)

      // Get unread notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_read', false)
      setUnreadNotifications(notifications?.length || 0)

      // Load certifications and types
      const [certsResult, typesResult] = await Promise.all([
        getCertifications(),
        getCertificationTypes()
      ])

      if (certsResult.data) {
        setCertifications(certsResult.data as Certification[])
      }
      if (typesResult.data) {
        setCertificationTypes(typesResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  
  useEffect(() => {
    loadData()
  }, [loadData])


  const handleAddSuccess = () => {
    loadData()
  }

  const handleEditClick = (cert: Certification) => {
    setSelectedCertification(cert)
    setIsEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    loadData()
    setIsEditModalOpen(false)
    setSelectedCertification(null)
  }

  const handleViewDetails = (certId: string) => {
    setLoadingCertificationId(certId)
    router.push(`/staff-dashboard/my-certifications/${certId}`)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status: string, expirationDate: string) => {
    const today = new Date()
    const expiry = new Date(expirationDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (status === 'Expired' || daysUntilExpiry <= 0) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Expired
        </span>
      )
    } else if (daysUntilExpiry <= 90) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
          Expiring Soon
        </span>
      )
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          Active
        </span>
      )
    }
  }

  const formatCertificationId = (cert: Certification) => {
    const parts = [cert.license_number]
    if (cert.state) {
      parts.push(cert.state)
    }
    return parts.join(' • ')
  }

  if (isLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <StaffLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Certifications</h1>
          <p className="text-gray-600 text-base md:text-lg">
            Manage all your professional certifications and licenses
          </p>
        </div>

        {/* Add New Certification Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Certification
          </button>
        </div>

        {/* Certifications List */}
        {certifications.length > 0 ? (
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3 relative">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {cert.type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatCertificationId(cert)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 absolute right-[15.5rem] top-[0.4rem]">
                        {getStatusBadge(cert.status, cert.expiration_date)}
                      </div>

                      
                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEditClick(cert)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleViewDetails(cert.id)}
                          disabled={loadingCertificationId === cert.id}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingCertificationId === cert.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              View Details
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Expiration Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(cert.expiration_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Issuing Authority</p>
                        <p className="text-sm font-medium text-gray-900">
                          {cert.issuing_authority}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-md border border-gray-100">
            <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No certifications yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first certification</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add New Certification
            </button>
          </div>
        )}
      </div>

      {/* Add Certification Modal */}
      <AddCertificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
        certificationTypes={certificationTypes}
      />

      {/* Edit Certification Modal */}
      {selectedCertification && (
        <EditCertificationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedCertification(null)
          }}
          onSuccess={handleEditSuccess}
          certificationTypes={certificationTypes}
          certification={selectedCertification}
        />
      )}
    </StaffLayout>
  )
}

export default function MyCertificationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <MyCertificationsContent />
    </Suspense>
  )
}
