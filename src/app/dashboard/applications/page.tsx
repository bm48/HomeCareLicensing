import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { 
  ClipboardList, 
  Clock, 
  FileText, 
  AlertCircle,
  Search,
  ArrowRight,
  Upload,
  Plus
} from 'lucide-react'

export default async function ApplicationsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = await createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Get all applications
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('company_owner_id', session.user.id)
    .order('last_updated_date', { ascending: false })

  // Get application documents count
  const { data: applicationDocuments } = await supabase
    .from('application_documents')
    .select('application_id')

  const documentCounts = applicationDocuments?.reduce((acc: Record<string, number>, doc) => {
    acc[doc.application_id] = (acc[doc.application_id] || 0) + 1
    return acc
  }, {}) || {}

  // Calculate statistics
  const inProgressCount = applications?.filter(a => a.status === 'in_progress').length || 0
  const underReviewCount = applications?.filter(a => a.status === 'under_review').length || 0
  const needsRevisionCount = applications?.filter(a => a.status === 'needs_revision').length || 0

  // Categorize applications
  const inProgressApps = applications?.filter(a => a.status === 'in_progress') || []
  const underReviewApps = applications?.filter(a => a.status === 'under_review') || []
  const needsRevisionApps = applications?.filter(a => a.status === 'needs_revision') || []

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Get state abbreviation
  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
  }

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
    <DashboardLayout user={session.user} profile={profile} unreadNotifications={unreadNotifications || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">License Applications</h1>
            <p className="text-gray-600 text-lg">
              Manage your in-process license applications and supporting documents
            </p>
          </div>
          <Link
            href="/dashboard/applications/new"
            className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Application
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search applications by state..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">In Progress</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{inProgressCount}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-600">Under Review</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{underReviewCount}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-semibold text-gray-600">Needs Revision</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{needsRevisionCount}</div>
          </div>
        </div>

        {/* In Progress Section */}
        {inProgressApps.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">In Progress</h2>
            </div>

            <div className="space-y-4">
              {inProgressApps.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
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
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Application Documents {documentCounts[application.id] || 0}
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
                      href={`/dashboard/applications/${application.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
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
              <h2 className="text-xl font-bold text-gray-900">Under Review</h2>
            </div>

            <div className="space-y-4">
              {underReviewApps.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
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
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Application Documents {documentCounts[application.id] || 0}
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
                      href={`/dashboard/applications/${application.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
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
              <h2 className="text-xl font-bold text-gray-900">Needs Revision</h2>
            </div>

            <div className="space-y-4">
              {needsRevisionApps.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
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
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Application Documents {documentCounts[application.id] || 0}
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
                      href={`/dashboard/applications/${application.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {applications?.length === 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first license application</p>
            <Link
              href="/dashboard/applications/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
            >
              <Plus className="w-5 h-5" />
              New Application
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

