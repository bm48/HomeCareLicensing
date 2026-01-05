import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StaffLayout from '@/components/StaffLayout'
import Link from 'next/link'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Plus,
  Calendar
} from 'lucide-react'

export default async function StaffDashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = await createClient()
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile) {
    // If profile can't be loaded, redirect to login
    redirect('/login?error=Unable to load user profile')
  }

  // Verify user has staff_member role
  if (profile.role !== 'staff_member') {
    redirect('/login?error=Access denied. Staff member role required.')
  }

  // Get staff member record
  const { data: staffMember, error: staffMemberError } = await supabase
    .from('staff_members')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (staffMemberError || !staffMember) {
    // If staff member record doesn't exist, redirect to login with helpful message
    redirect('/login?error=Staff member record not found. Please contact your administrator.')
  }

  // Get staff licenses
  const { data: staffLicenses } = await supabase
    .from('staff_licenses')
    .select('*')
    .eq('staff_member_id', staffMember.id)
    .order('expiry_date', { ascending: true })

  // Get unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  const unreadNotifications = notifications?.length || 0

  // Calculate statistics
  const today = new Date()
  const activeLicenses = staffLicenses?.filter(l => {
    if (l.status === 'active') {
      const expiryDate = new Date(l.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry > 0
    }
    return false
  }).length || 0

  const expiringSoon = staffLicenses?.filter(l => {
    if (l.days_until_expiry !== null && l.days_until_expiry !== undefined) {
      return l.days_until_expiry <= 90 && l.days_until_expiry > 0 && l.status === 'active'
    }
    return false
  }).length || 0

  const expiredLicenses = staffLicenses?.filter(l => {
    if (l.status === 'expired') {
      return true
    }
    if (l.days_until_expiry !== null && l.days_until_expiry !== undefined) {
      return l.days_until_expiry <= 0
    }
    return false
  }).length || 0

  // Get licenses expiring within 90 days
  const licensesExpiringSoon = staffLicenses?.filter(l => {
    if (l.days_until_expiry !== null && l.days_until_expiry !== undefined) {
      return l.days_until_expiry <= 90 && l.days_until_expiry > 0 && l.status === 'active'
    }
    return false
  }) || []

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string | Date) => {
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <StaffLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications}
    >
      <div className="space-y-6">
        {/* Title and Subtitle */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My License Dashboard</h1>
          <p className="text-gray-600 text-base md:text-lg">
            Track and manage your professional licenses and certifications.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {/* Active Licenses */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{activeLicenses}</div>
            <div className="text-sm text-gray-600">Active Licenses</div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{expiringSoon}</div>
            <div className="text-sm text-gray-600">Expiring Soon</div>
          </div>

          {/* Expired Licenses */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{expiredLicenses}</div>
            <div className="text-sm text-gray-600">Expired Licenses</div>
          </div>
        </div>

        {/* Action Required: Licenses Expiring Soon */}
        {licensesExpiringSoon.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                  Action Required: Licenses Expiring Soon
                </h2>
                <p className="text-sm md:text-base text-gray-700">
                  You have {licensesExpiringSoon.length} license(s) expiring within 90 days. Please renew them to maintain your active status.
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {licensesExpiringSoon.map((license) => {
                const daysUntilExpiry = license.days_until_expiry || getDaysUntilExpiry(license.expiry_date)
                return (
                  <div 
                    key={license.id} 
                    className="bg-white rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{license.license_type}</h3>
                      <p className="text-sm text-gray-600">
                        Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base whitespace-nowrap">
                      Renew
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Licenses & Certifications */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">All Licenses & Certifications</h2>
            <Link
              href="/staff-dashboard/my-licenses?action=add"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Add License
            </Link>
          </div>

          <div className="space-y-4">
            {staffLicenses && staffLicenses.length > 0 ? (
              staffLicenses.map((license) => {
                const daysUntilExpiry = license.days_until_expiry !== null && license.days_until_expiry !== undefined
                  ? license.days_until_expiry
                  : getDaysUntilExpiry(license.expiry_date)
                
                let status = license.status
                if (status === 'active' && daysUntilExpiry <= 0) {
                  status = 'expired'
                } else if (status === 'active' && daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
                  status = 'expiring'
                }

                const statusBadgeClass = status === 'active' 
                  ? 'bg-green-100 text-green-700'
                  : status === 'expiring'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'

                return (
                  <div 
                    key={license.id} 
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 text-base md:text-lg">
                        {license.license_type}
                      </h3>
                      <div className="text-sm text-gray-600 mb-2">
                        License #: {license.license_number}
                        {license.state && ` • ${license.state}`}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                        {license.issue_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Issued: {formatDate(license.issue_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Expires: {formatDate(license.expiry_date)}</span>
                        </div>
                        {license.issuing_authority && (
                          <div>
                            Issuing Authority: {license.issuing_authority}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No licenses yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first license or certification</p>
                <Link
                  href="/staff-dashboard/my-licenses?action=add"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add License
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}

