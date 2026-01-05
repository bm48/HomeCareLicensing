import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Search,
  ArrowRight,
  Upload
} from 'lucide-react'

export default async function LicensesPage() {
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

  // Get all licenses
  const { data: licenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('company_owner_id', session.user.id)
    .order('expiry_date', { ascending: true })

  // Get license documents count
  const { data: licenseDocuments } = await supabase
    .from('license_documents')
    .select('license_id')

  const documentCounts = licenseDocuments?.reduce((acc: Record<string, number>, doc) => {
    acc[doc.license_id] = (acc[doc.license_id] || 0) + 1
    return acc
  }, {}) || {}

  // Calculate statistics
  const today = new Date()
  const activeLicenses = licenses?.filter(l => {
    if (l.status === 'active' && l.expiry_date) {
      const expiryDate = new Date(l.expiry_date)
      return expiryDate >= today
    }
    return l.status === 'active'
  }).length || 0

  const expiringLicenses = licenses?.filter(l => {
    if (l.expiry_date && l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0
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

  // Categorize licenses
  const activeLicensesList = licenses?.filter(l => {
    if (l.status === 'active' && l.expiry_date) {
      const expiryDate = new Date(l.expiry_date)
      return expiryDate >= today
    }
    return l.status === 'active'
  }) || []

  const expiringLicensesList = licenses?.filter(l => {
    if (l.expiry_date && l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0
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

  return (
    <DashboardLayout user={session.user} profile={profile} unreadNotifications={unreadNotifications || 0}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">License Management</h1>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
              Manage your home care licenses across all states
            </p>
          </div>
          <Link
            href="/dashboard/licenses/new"
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">New License Application</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search licenses by state..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="text-sm font-semibold text-gray-600">Active</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{activeLicenses}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-semibold text-gray-600">Expiring Soon</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{expiringLicenses}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-red-600" />
              <span className="text-sm font-semibold text-gray-600">Expired</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{expiredLicenses}</div>
          </div>
        </div>

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

        {/* Empty State */}
        {licenses?.length === 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No licenses yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first license application</p>
            <Link
              href="/dashboard/licenses/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
            >
              <FileText className="w-5 h-5" />
              New License Application
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

