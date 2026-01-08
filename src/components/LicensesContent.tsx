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
  ClipboardList
} from 'lucide-react'
import NewLicenseApplicationModal from './NewLicenseApplicationModal'
import SelectLicenseTypeModal from './SelectLicenseTypeModal'
import ReviewLicenseRequestModal from './ReviewLicenseRequestModal'
import UploadDocumentButton from './UploadDocumentButton'
import ApplicationDocumentsPanel from './ApplicationDocumentsPanel'
import { LicenseType } from '@/types/license'

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
  const [activeTab, setActiveTab] = useState<'applications' | 'licenses'>('licenses')
  const [isStateModalOpen, setIsStateModalOpen] = useState(false)
  const [isLicenseTypeModalOpen, setIsLicenseTypeModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null)
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
  const inProgressCount = applications?.filter(a => a.status === 'in_progress').length || 0
  const underReviewCount = applications?.filter(a => a.status === 'under_review').length || 0
  const needsRevisionCount = applications?.filter(a => a.status === 'needs_revision').length || 0

  // Categorize applications
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
            <span className="whitespace-nowrap">New License Application</span>
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
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-5 h-5" />
            Applications
            {applications.length > 0 && (
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {applications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
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
        {activeTab === 'applications' ? (
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

        {/* Applications Tab Content */}
        {activeTab === 'applications' && (
          <>
            {/* In Progress Section */}
            {inProgressApps.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">In Progress</h2>
                </div>

                <div className="space-y-4">
                  {inProgressApps.map((application) => (
                    <div key={application.id}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                              <span>Started {formatDate(application.started_date)}</span>
                              <span>Last Updated {formatDate(application.last_updated_date)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${application.progress_percentage || 0}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{application.progress_percentage || 0}% complete</div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <button
                                onClick={() => setExpandedApplicationId(
                                  expandedApplicationId === application.id ? null : application.id
                                )}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                                Application Documents {applicationDocumentCounts[application.id] || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <UploadDocumentButton applicationId={application.id} />
                          <Link
                            href={`/dashboard/applications/${application.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                      {expandedApplicationId === application.id && (
                        <div className="mt-4">
                          <ApplicationDocumentsPanel
                            applicationId={application.id}
                            documentCount={applicationDocumentCounts[application.id] || 0}
                            onDocumentUploaded={() => {
                              window.location.reload()
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Under Review Section */}
            {underReviewApps.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-bold text-gray-900">Under Review</h2>
                </div>

                <div className="space-y-4">
                  {underReviewApps.map((application) => (
                    <div key={application.id}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                              <span>Started {formatDate(application.started_date)}</span>
                              <span>Last Updated {formatDate(application.last_updated_date)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${application.progress_percentage || 0}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{application.progress_percentage || 0}% complete</div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <button
                                onClick={() => setExpandedApplicationId(
                                  expandedApplicationId === application.id ? null : application.id
                                )}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                                Application Documents {applicationDocumentCounts[application.id] || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <UploadDocumentButton applicationId={application.id} />
                          <Link
                            href={`/dashboard/applications/${application.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                      {expandedApplicationId === application.id && (
                        <div className="mt-4">
                          <ApplicationDocumentsPanel
                            applicationId={application.id}
                            documentCount={applicationDocumentCounts[application.id] || 0}
                            onDocumentUploaded={() => {
                              window.location.reload()
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Needs Revision Section */}
            {needsRevisionApps.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-bold text-gray-900">Needs Revision</h2>
                </div>

                <div className="space-y-4">
                  {needsRevisionApps.map((application) => (
                    <div key={application.id}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                              <span>Started {formatDate(application.started_date)}</span>
                              <span>Last Updated {formatDate(application.last_updated_date)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${application.progress_percentage || 0}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{application.progress_percentage || 0}% complete</div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <button
                                onClick={() => setExpandedApplicationId(
                                  expandedApplicationId === application.id ? null : application.id
                                )}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                                Application Documents {applicationDocumentCounts[application.id] || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <UploadDocumentButton applicationId={application.id} />
                          <Link
                            href={`/dashboard/applications/${application.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                      {expandedApplicationId === application.id && (
                        <div className="mt-4">
                          <ApplicationDocumentsPanel
                            applicationId={application.id}
                            documentCount={applicationDocumentCounts[application.id] || 0}
                            onDocumentUploaded={() => {
                              window.location.reload()
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State for Applications */}
            {applications.length === 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first license application</p>
                <button
                  onClick={() => setIsStateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New License Application
                </button>
              </div>
            )}
          </>
        )}

        {/* Licenses Tab Content */}
        {activeTab === 'licenses' && (
          <>
            {/* Active Licenses Section */}
            {activeLicensesList.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Active Licenses</h2>
            </div>

            <div className="space-y-4">
              {activeLicensesList.map((license) => (
                <div key={license.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {getStateAbbr(license.state)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{license.license_name}</h3>
                        <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-semibold">
                          active
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {license.activated_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Activated {formatDate(license.activated_date)}
                          </div>
                        )}
                        {license.expiry_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Expires {formatDate(license.expiry_date)}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          License Documents {documentCounts[license.id] || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/licenses/${license.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Soon Section */}
        {expiringLicensesList.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Expiring Soon</h2>
            </div>

            <div className="space-y-4">
              {expiringLicensesList.map((license) => {
                const expiryDate = license.expiry_date ? new Date(license.expiry_date) : null
                const renewalDueDate = license.renewal_due_date ? new Date(license.renewal_due_date) : null
                return (
                  <div key={license.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {getStateAbbr(license.state)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{license.license_name}</h3>
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                            expiring
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          {license.activated_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Activated {formatDate(license.activated_date)}
                            </div>
                          )}
                          {expiryDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Expires {formatDate(expiryDate)}
                            </div>
                          )}
                          {renewalDueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Renewal Due {formatDate(renewalDueDate)}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            Renewal Documents 0
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                  </div>
                )
              })}
            </div>
          </div>
        )}

            {/* Empty State for Licenses */}
            {licenses.length === 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No licenses yet</h3>
                <p className="text-gray-600 mb-6">Get started by adding your first license application</p>
                <button
                  onClick={() => setIsStateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                >
                  <FileText className="w-5 h-5" />
                  New License Application
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

