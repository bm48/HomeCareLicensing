'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Mail, 
  Clock, 
  MapPin, 
  FileText,
  Search,
  Calendar,
  AlertCircle
} from 'lucide-react'
import ExpertApplicationDetailModal from './ExpertApplicationDetailModal'

interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  submitted_date: string | Date | null
  created_at: string | Date | null
  company_owner_id: string
  assigned_expert_id: string | null
  license_type_id: string | null
  revision_reason?: string | null
  owner_profile: {
    id: string
    full_name: string | null
    email: string
    created_at: string
  } | null
}

interface OwnerProfile {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

interface ExpertClientsContentProps {
  applicationsByOwner: Record<string, Application[]>
  ownerProfiles: OwnerProfile[]
  totalClients: number
  activeApplications: number
  pendingReviews: number
}

export default function ExpertClientsContent({
  applicationsByOwner: applicationsByOwnerProp,
  ownerProfiles: ownerProfilesProp,
  totalClients,
  activeApplications,
  pendingReviews
}: ExpertClientsContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  // Ensure applicationsByOwner and ownerProfiles are not null/undefined
  const applicationsByOwner = applicationsByOwnerProp || {}
  const ownerProfiles = ownerProfilesProp || []

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700'
      case 'needs_revision':
        return 'bg-orange-100 text-orange-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Create a map of owner profiles by ID for quick lookup
  const ownerProfilesMap = new Map(
    ownerProfiles.map(profile => [profile.id, profile])
  )

  // Get unique owner IDs from applicationsByOwner keys (these are the owners with applications)
  const ownerIdsWithApplications = Object.keys(applicationsByOwner || {}).filter(Boolean)

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('ExpertClientsContent Debug:', {
      applicationsByOwnerKeys: ownerIdsWithApplications,
      applicationsByOwnerCount: ownerIdsWithApplications.length,
      ownerProfilesCount: ownerProfiles.length,
      totalClients,
      activeApplications,
      pendingReviews,
      applicationsByOwnerType: typeof applicationsByOwner,
      applicationsByOwnerIsObject: applicationsByOwner !== null && typeof applicationsByOwner === 'object',
      applicationsByOwnerKeysList: Object.keys(applicationsByOwner || {}),
      applicationsByOwner: Object.keys(applicationsByOwner || {}).reduce((acc, key) => {
        if (applicationsByOwner && applicationsByOwner[key]) {
          acc[key] = applicationsByOwner[key].length
        }
        return acc
      }, {} as Record<string, number>),
      sampleApplicationsByOwner: applicationsByOwner && ownerIdsWithApplications.length > 0 
        ? { 
            [ownerIdsWithApplications[0]]: applicationsByOwner[ownerIdsWithApplications[0]]?.map(app => ({
              id: app.id,
              name: app.application_name,
              owner_id: app.company_owner_id
            }))
          }
        : null
    })
  }

  // Build owners list from applicationsByOwner, matching with owner profiles
  const ownersWithApplications = ownerIdsWithApplications.map(ownerId => {
    const profile = ownerProfilesMap.get(ownerId)
    const applications = applicationsByOwner[ownerId] || []
    // Get owner info from first application's owner_profile if profile not found
    const appOwnerProfile = applications[0]?.owner_profile
    return {
      id: ownerId,
      full_name: profile?.full_name || appOwnerProfile?.full_name || null,
      email: profile?.email || appOwnerProfile?.email || 'Unknown',
      created_at: profile?.created_at || appOwnerProfile?.created_at || new Date().toISOString()
    }
  })

  // Filter owners based on search query
  const filteredOwners = ownersWithApplications.filter(owner => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = (owner.full_name || '').toLowerCase()
    const email = (owner.email || '').toLowerCase()
    return name.includes(query) || email.includes(query)
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">My Clients</h1>
        <p className="text-gray-600 text-xs sm:text-sm">
          Manage and support your assigned clients and their applications
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Clients */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{totalClients}</div>
          <div className="text-xs sm:text-sm text-gray-600">Total Clients</div>
        </div>

        {/* Active Applications */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{activeApplications}</div>
          <div className="text-xs sm:text-sm text-gray-600">Active Applications</div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{pendingReviews}</div>
          <div className="text-xs sm:text-sm text-gray-600">Pending Reviews</div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4 sm:space-y-6">
        {filteredOwners.length > 0 ? (
          filteredOwners.map((owner) => {
            const applications = applicationsByOwner[owner.id] || []
            // Debug log for each owner (only in development)
            if (process.env.NODE_ENV === 'development') {
              console.log('Rendering owner:', {
                ownerId: owner.id,
                ownerEmail: owner.email,
                ownerName: owner.full_name,
                applicationsCount: applications.length,
                applications: applications.map(app => ({ id: app.id, name: app.application_name, status: app.status }))
              })
            }
            return (
              <div key={owner.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                {/* Client Header */}
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {owner.full_name || owner.email || 'Unknown Client'}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{owner.email}</span>
                    </div>
                    {owner.created_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Client Since: {formatDate(owner.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* License Applications */}
                {applications.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      License Applications ({applications.length})
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {applications.map((application) => (
                        <div
                          key={application.id}
                          className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-gray-50 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-base sm:text-lg mb-1">
                                  {application.application_name}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {application.state}
                                  </span>
                                  {application.created_at && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      Created: {formatDate(application.created_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadge(application.status)}`}>
                              {getStatusDisplay(application.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm mb-3 sm:mb-4">
                            {application.progress_percentage !== null && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">Progress:</span>
                                <span className="font-semibold text-blue-600">{application.progress_percentage}%</span>
                              </div>
                            )}
                            {application.started_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Started: {formatDate(application.started_date)}</span>
                              </div>
                            )}
                            {application.last_updated_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Updated: {formatDate(application.last_updated_date)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setSelectedApplication(application)
                                setDetailModalOpen(true)
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              View Application Details
                            </button>
                            {(application.status === 'under_review' || application.status === 'needs_revision') && (
                              <span className="flex items-center gap-1 text-sm text-yellow-700 font-medium">
                                <AlertCircle className="w-4 h-4" />
                                Requires Review
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {applications.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No license applications for this client yet</p>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 sm:p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients assigned</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'No clients match your search criteria.' 
                : 'You don\'t have any assigned clients yet. Once applications are assigned to you, clients will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <ExpertApplicationDetailModal
        application={selectedApplication}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedApplication(null)
          router.refresh()
        }}
      />
    </div>
  )
}
