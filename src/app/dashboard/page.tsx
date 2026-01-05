import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { 
  Shield, 
  Users, 
  Clock, 
  Bell, 
  CheckCircle2, 
  ArrowRight,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react'

export default async function DashboardPage() {
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

  // Redirect experts to their dashboard
  if (profile?.role === 'expert') {
    redirect('/dashboard/expert/clients')
  }

  // Get statistics
  const { data: licenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('company_owner_id', session.user.id)

  const { data: staff } = await supabase
    .from('staff_members')
    .select('*')
    .eq('company_owner_id', session.user.id)
    .eq('status', 'active')

  const { data: staffLicenses } = await supabase
    .from('staff_licenses')
    .select('*')
    .in('staff_member_id', staff?.map(s => s.id) || [])
    .eq('status', 'active')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate statistics
  const activeLicenses = licenses?.filter(l => l.status === 'active').length || 0
  const expiringLicenses = licenses?.filter(l => {
    if (l.expiry_date && l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0
    }
    return false
  }).length || 0

  const expiringStaffCertifications = staffLicenses?.filter(sl => {
    if (sl.days_until_expiry) {
      return sl.days_until_expiry <= 30 && sl.days_until_expiry > 0
    }
    return false
  }).length || 0

  const expiringSoon = expiringLicenses + expiringStaffCertifications
  const unreadNotifications = notifications?.length || 0

  // Get recent licenses
  const recentLicenses = licenses?.slice(0, 2).map(license => {
    const expiryDate = license.expiry_date ? new Date(license.expiry_date) : null
    const today = new Date()
    let status = license.status
    if (status === 'active' && expiryDate) {
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
        status = 'expiring'
      } else if (daysUntilExpiry <= 0) {
        status = 'expired'
      }
    }
    return { ...license, status, expiryDate }
  }) || []

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'license_expiring':
      case 'staff_certification_expiring':
        return AlertCircle
      case 'application_update':
      case 'document_approved':
      case 'document_rejected':
        return FileText
      case 'general':
        return Bell
      default:
        return Bell
    }
  }

  // Get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'license_expiring':
      case 'staff_certification_expiring':
        return 'text-orange-500'
      case 'document_approved':
        return 'text-green-500'
      case 'application_update':
      case 'document_rejected':
        return 'text-blue-500'
      default:
        return 'text-purple-500'
    }
  }

  return (
    <DashboardLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
            Here's an overview of your home care licensing operations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Active Licenses */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{activeLicenses}</div>
            <div className="text-xs sm:text-sm text-gray-600">Active Licenses</div>
          </div>

          {/* Nursing Staff */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{staff?.length || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600">Nursing Staff</div>
            <div className="text-xs text-gray-500 mt-1">Active and certified</div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{expiringSoon}</div>
            <div className="text-xs sm:text-sm text-gray-600">Expiring Soon</div>
            <div className="text-xs text-gray-500 mt-1">
              {expiringLicenses} licenses, {expiringStaffCertifications} certifications
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{unreadNotifications}</div>
            <div className="text-xs sm:text-sm text-gray-600">Notifications</div>
            <div className="text-xs text-gray-500 mt-1">Unread messages</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Your Licenses */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Licenses</h2>
              <Link 
                href="/dashboard/licenses"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentLicenses.length > 0 ? (
                recentLicenses.map((license) => (
                  <div key={license.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                      license.state === 'CA' ? 'bg-green-500' : 
                      license.state === 'TX' ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }`}>
                      {license.state}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{license.license_name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        Expires {formatDate(license.expiryDate)}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      license.status === 'active' 
                        ? 'bg-black text-white' 
                        : license.status === 'expiring'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {license.status === 'active' ? 'active' : license.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No licenses yet</p>
                  <Link 
                    href="/dashboard/licenses"
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                  >
                    Add your first license
                  </Link>
                </div>
              )}
            </div>

            {recentLicenses.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/dashboard/licenses"
                  className="block w-full text-center py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                >
                  Manage All Licenses
                </Link>
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Notifications</h2>
              {unreadNotifications > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                  {unreadNotifications} new
                </span>
              )}
            </div>

            <div className="space-y-3">
              {notifications && notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  return (
                    <div key={notification.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getNotificationColor(notification.type)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{notification.title}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Sections - Staff Preview */}
        {staff && staff.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Nursing Staff</h2>
              <Link 
                href="/dashboard/staff"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-gray-600">
              {staff.length} total staff members
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
