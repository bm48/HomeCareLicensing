'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Search,
  ArrowRight,
  Upload,
  Clock,
  Plus,
  ClipboardList,
  RefreshCw,
  Loader2
} from 'lucide-react'
import NewLicenseApplicationModal from './NewLicenseApplicationModal'
import SelectLicenseTypeModal from './SelectLicenseTypeModal'
import ReviewLicenseRequestModal from './ReviewLicenseRequestModal'
import { LicenseType } from '@/types/license'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface License {
  id: string
  license_name: string
  state: string
  status: string
  activated_date: string | Date | null
  expiry_date: string | Date | null
  renewal_due_date: string | Date | null
}

interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  revision_reason?: string | null
}

interface LicensesContentProps {
  licenses: License[]
  documentCounts: Record<string, number>
  applications?: Application[]
  applicationDocumentCounts?: Record<string, number>
}

export default function LicensesContent({ 
  licenses, 
  documentCounts, 
  applications = [], 
  applicationDocumentCounts = {} 
}: LicensesContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requested' | 'applications' | 'licenses'>('licenses')
  const [isStateModalOpen, setIsStateModalOpen] = useState(false)
  const [isLicenseTypeModalOpen, setIsLicenseTypeModalOpen] = useState(false)
  const [resubmittingId, setResubmittingId] = useState<string | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedLicenseType, setSelectedLicenseType] = useState<LicenseType | null>(null)

  const handleStateSelect = (state: string) => {
    setSelectedState(state)
    setIsStateModalOpen(false)
    setIsLicenseTypeModalOpen(true)
  }

  const handleLicenseTypeSelect = (licenseType: LicenseType) => {
    setSelectedLicenseType(licenseType)
    setIsLicenseTypeModalOpen(false)
    setIsReviewModalOpen(true)
  }

  const handleBackToStateSelection = () => {
    setIsLicenseTypeModalOpen(false)
    setIsStateModalOpen(true)
  }

  const handleBackToLicenseTypes = () => {
    setIsReviewModalOpen(false)
    setIsLicenseTypeModalOpen(true)
  }

  const handleCloseAll = () => {
    setIsStateModalOpen(false)
    setIsLicenseTypeModalOpen(false)
    setIsReviewModalOpen(false)
    setSelectedState('')
    setSelectedLicenseType(null)
  }

  const handleResubmit = async (applicationId: string) => {
    setResubmittingId(applicationId)
    
    try {
      const supabase = createClient()
      
      // Change status from 'needs_revision' to 'in_progress' to allow resubmission
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'in_progress',
          revision_reason: null // Clear revision reason on resubmit
        })
        .eq('id', applicationId)

      if (error) throw error

      router.refresh()
    } catch (error: any) {
      console.error('Error resubmitting application:', error)
      alert('Failed to resubmit application: ' + (error.message || 'Unknown error'))
    } finally {
      setResubmittingId(null)
    }
  }

  // Calculate statistics
  const today = new Date()
  
  // First calculate expiring licenses (these take priority)
  const expiringLicenses = licenses?.filter(l => {
    if (l.expiry_date && l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0
    }
    return false
  }).length || 0

  // Then calculate active licenses (excluding those that are expiring soon)
  const activeLicenses = licenses?.filter(l => {
    if (l.status === 'active') {
      if (l.expiry_date) {
        const expiryDate = new Date(l.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        // Only include if not expiring within 60 days and not expired
        return daysUntilExpiry > 60 && expiryDate >= today
      }
      return true // No expiry date, so it's active
    }
    return false
  }).length || 0

  const expiredLicenses = licenses?.filter(l => {
    if (l.expiry_date) {
      const expiryDate = new Date(l.expiry_date)
      return expiryDate < today
    }
    return l.status === 'expired'
  }).length || 0

  // Categorize licenses (mutually exclusive categories)
  // First, get expiring licenses (these take priority)
  const expiringLicensesList = licenses?.filter(l => {
    if (l.expiry_date && l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0
    }
    return false
  }) || []

  // Then, get active licenses (excluding those that are expiring soon)
  const activeLicensesList = licenses?.filter(l => {
    if (l.status === 'active') {
      // Exclude licenses that are in the expiring list
      if (l.expiry_date) {
        const expiryDate = new Date(l.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        // Only include if not expiring within 60 days and not expired
        return daysUntilExpiry > 60 && expiryDate >= today
      }
      return true // No expiry date, so it's active
    }
    return false
  }) || []

  const expiredLicensesList = licenses?.filter(l => {
    if (l.expiry_date) {
      const expiryDate = new Date(l.expiry_date)
      return expiryDate < today
    }
    return l.status === 'expired'
  }) || []

  // Calculate total displayed licenses (sum of all categories shown in cards)
  const totalDisplayedLicenses = activeLicensesList.length + expiringLicensesList.length + expiredLicensesList.length

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Get state abbreviation (first 2 letters)
  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
  }

  // Application statistics
  const requestedCount = applications?.filter(a => a.status === 'requested').length || 0
  const inProgressCount = applications?.filter(a => a.status === 'in_progress').length || 0
  const underReviewCount = applications?.filter(a => a.status === 'under_review').length || 0
  const needsRevisionCount = applications?.filter(a => a.status === 'needs_revision').length || 0

  // Categorize applications
  const requestedApps = applications?.filter(a => a.status === 'requested') || []
  const inProgressApps = applications?.filter(a => a.status === 'in_progress') || []
  const underReviewApps = applications?.filter(a => a.status === 'under_review') || []
  const needsRevisionApps = applications?.filter(a => a.status === 'needs_revision') || []

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
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

  // Get status display name
  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-2xl font-bold text-gray-900 mb-2">License Management</h1>
            <p className="text-gray-600 text-xs sm:text-sm lg:text-sm">
              Manage your license applications and active licenses
            </p>
          </div>
          <button
            onClick={() => setIsStateModalOpen(true)}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">New Application Request</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={activeTab === 'applications' ? 'Search by state...' : 'Search by state...'}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('requested')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'requested'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            Requested
            {requestedCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {requestedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-5 h-5" />
            Applications
            {(inProgressCount + underReviewCount + needsRevisionCount) > 0 && (
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {inProgressCount + underReviewCount + needsRevisionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'licenses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            Current Licenses
            {totalDisplayedLicenses > 0 && (
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {totalDisplayedLicenses}
              </span>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        {activeTab === 'requested' ? (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-semibold text-gray-600">Pending Approval</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{requestedCount}</div>
              <p className="text-sm text-gray-500 mt-1">Waiting for admin approval</p>
            </div>
          </div>
        ) : activeTab === 'applications' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-semibold text-gray-600">In Progress</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{inProgressCount}</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-yellow-600" />
                <span className="text-sm font-semibold text-gray-600">Under Review</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{underReviewCount}</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <span className="text-sm font-semibold text-gray-600">Needs Revision</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{needsRevisionCount}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <span className="text-sm font-semibold text-gray-600">Active</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{activeLicenses}</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <span className="text-sm font-semibold text-gray-600">Expiring Soon</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{expiringLicenses}</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-6 h-6 text-red-600" />
                <span className="text-sm font-semibold text-gray-600">Expired</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{expiredLicenses}</div>
            </div>
          </div>
        )}

        {/* Requested Tab Content */}
        {activeTab === 'requested' && (
          <>
            {requestedApps.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Requested Applications</h2>
                </div>

                <div className="space-y-4">
                  {requestedApps.map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {getStateAbbr(application.state)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{application.application_name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(application.status)}`}>
                              {getStatusDisplay(application.status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <span>Submitted {formatDate(application.created_at || application.submitted_date)}</span>
                            <span>State: {application.state}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Waiting for admin approval
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          Pending Review
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No requested applications</h3>
                <p className="text-gray-600 mb-6">All your application requests have been approved or you haven't submitted any yet</p>
                <button
                  onClick={() => setIsStateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Application Request
                </button>
              </div>
            )}
          </>
        )}

        {/* Applications Tab Content */}
        {activeTab === 'applications' && (
          <>
            {(inProgressApps.length > 0 || underReviewApps.length > 0 || needsRevisionApps.length > 0) ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">State</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Application Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Started Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Updated</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expert Feedback</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* In Progress Applications */}
                      {inProgressApps.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {getStateAbbr(application.state)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{application.application_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(application.status)}`}>
                              {getStatusDisplay(application.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32">
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${application.progress_percentage || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500">{application.progress_percentage || 0}%</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.started_date ? formatDate(application.started_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.last_updated_date ? formatDate(application.last_updated_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="text-gray-400">-</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/dashboard/applications/${application.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 justify-end"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {/* Under Review Applications */}
                      {underReviewApps.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {getStateAbbr(application.state)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{application.application_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(application.status)}`}>
                              {getStatusDisplay(application.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32">
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${application.progress_percentage || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500">{application.progress_percentage || 0}%</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.started_date ? formatDate(application.started_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.last_updated_date ? formatDate(application.last_updated_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="text-gray-400">-</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/dashboard/applications/${application.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 justify-end"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {/* Needs Revision Applications */}
                      {needsRevisionApps.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {getStateAbbr(application.state)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{application.application_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(application.status)}`}>
                              {getStatusDisplay(application.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32">
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${application.progress_percentage || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500">{application.progress_percentage || 0}%</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.started_date ? formatDate(application.started_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {application.last_updated_date ? formatDate(application.last_updated_date) : <span className="text-gray-400">N/A</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                            {application.revision_reason ? (
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                <span className="text-orange-700 line-clamp-2">{application.revision_reason}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex flex-col items-end gap-2">
                              <Link
                                href={`/dashboard/applications/${application.id}`}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                              >
                                View Details
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleResubmit(application.id)}
                                disabled={resubmittingId === application.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {resubmittingId === application.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Resubmitting...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    Resubmit
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-600 mb-6">Approved applications will appear here once they are in progress</p>
                <button
                  onClick={() => setIsStateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Application Request
                </button>
              </div>
            )}
          </>
        )}

        {/* Licenses Tab Content */}
        {activeTab === 'licenses' && (
          <>
            {/* All Licenses Table */}
            {licenses.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">State</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">License Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Activated Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Renewal Due Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Documents</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Active Licenses */}
                      {activeLicensesList.map((license) => (
                        <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {getStateAbbr(license.state)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{license.license_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-semibold">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.activated_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.activated_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.expiry_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.expiry_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.renewal_due_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.renewal_due_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {documentCounts[license.id] || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/dashboard/licenses/${license.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 justify-end"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {/* Expiring Soon Licenses */}
                      {expiringLicensesList.map((license) => {
                        const expiryDate = license.expiry_date ? new Date(license.expiry_date) : null
                        const renewalDueDate = license.renewal_due_date ? new Date(license.renewal_due_date) : null
                        return (
                          <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {getStateAbbr(license.state)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{license.license_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                Expiring Soon
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {license.activated_date ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(license.activated_date)}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {expiryDate ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(expiryDate)}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {renewalDueDate ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(renewalDueDate)}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                0
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-3 justify-end">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium">
                                  <Upload className="w-4 h-4" />
                                  Upload
                                </button>
                                <Link
                                  href={`/dashboard/licenses/${license.id}`}
                                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                                >
                                  View Details
                                  <ArrowRight className="w-4 h-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {/* Expired Licenses */}
                      {expiredLicensesList.map((license) => (
                        <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {getStateAbbr(license.state)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{license.license_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              Expired
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.activated_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.activated_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.expiry_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.expiry_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {license.renewal_due_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(license.renewal_due_date)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {documentCounts[license.id] || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/dashboard/licenses/${license.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 justify-end"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Empty State for Licenses */
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No licenses yet</h3>
                <p className="text-gray-600 mb-6">Get started by adding your first license application</p>
                <button
                  onClick={() => setIsStateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                >
                  <FileText className="w-5 h-5" />
                  New Application Request
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* State Selection Modal */}
      <NewLicenseApplicationModal
        isOpen={isStateModalOpen}
        onClose={handleCloseAll}
        onStateSelect={handleStateSelect}
      />

      {/* License Type Selection Modal */}
      {selectedState && (
        <SelectLicenseTypeModal
          isOpen={isLicenseTypeModalOpen}
          onClose={handleCloseAll}
          state={selectedState}
          onSelectLicenseType={handleLicenseTypeSelect}
          onBack={handleBackToStateSelection}
        />
      )}

      {/* Review License Request Modal */}
      {selectedState && selectedLicenseType && (
        <ReviewLicenseRequestModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseAll}
          state={selectedState}
          licenseType={selectedLicenseType}
          onBack={handleBackToLicenseTypes}
        />
      )}
    </>
  )
}

