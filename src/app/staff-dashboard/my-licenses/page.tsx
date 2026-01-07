import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StaffLayout from '@/components/StaffLayout'
import Link from 'next/link'
import { 
  FileText,
  Plus,
  Calendar,
  Edit,
  Eye
} from 'lucide-react'

export default async function MyLicensesPage() {
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

  // Get staff member record
  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!staffMember) {
    redirect('/login')
  }

  // Get staff licenses
  const { data: staffLicenses } = await supabase
    .from('staff_licenses')
    .select('*')
    .eq('staff_member_id', staffMember.id)
    .order('expiry_date', { ascending: true })

  // Get unread notifications
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Calculate days until expiry
  const today = new Date()
  const getDaysUntilExpiry = (expiryDate: string | Date) => {
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  // Get status badge styling
  const getStatusBadge = (license: NonNullable<typeof staffLicenses>[number]) => {
    const daysUntilExpiry = license.days_until_expiry !== null && license.days_until_expiry !== undefined
      ? license.days_until_expiry
      : getDaysUntilExpiry(license.expiry_date)
    
    let status = license.status
    if (status === 'active' && daysUntilExpiry <= 0) {
      status = 'expired'
    } else if (status === 'active' && daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
      status = 'expiring'
    }

    switch (status) {
      case 'active':
        return { class: 'bg-green-100 text-green-700', label: 'Active' }
      case 'expiring':
        return { class: 'bg-yellow-100 text-yellow-700', label: 'Expiring Soon' }
      case 'expired':
        return { class: 'bg-red-100 text-red-700', label: 'Expired' }
      default:
        return { class: 'bg-gray-100 text-gray-700', label: status }
    }
  }

  return (
    <StaffLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-6">
        {/* Title and Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">My Licenses</h1>
            <p className="text-gray-600 text-base md:text-lg">
              Manage all your professional licenses and certifications.
            </p>
          </div>
          <Link
            href="/staff-dashboard/my-licenses?action=add"
            className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Add New License
          </Link>
        </div>

        {/* Licenses List */}
        <div className="space-y-4">
          {staffLicenses && staffLicenses.length > 0 ? (
            staffLicenses.map((license) => {
              const statusBadge = getStatusBadge(license)
              const daysUntilExpiry = license.days_until_expiry !== null && license.days_until_expiry !== undefined
                ? license.days_until_expiry
                : getDaysUntilExpiry(license.expiry_date)

              return (
                <div 
                  key={license.id} 
                  className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Icon */}
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                    </div>

                    {/* Center: License Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
                            {license.license_type}
                          </h3>
                          <div className="text-sm md:text-base text-gray-600">
                            {license.license_number}
                            {license.state && ` • ${license.state}`}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Expires: {formatDate(license.expiry_date)}</span>
                        </div>
                        {license.issue_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Issued: {formatDate(license.issue_date)}</span>
                          </div>
                        )}
                      </div>

                      {license.issuing_authority && (
                        <div className="text-sm text-gray-600 mb-3">
                          Issuing Authority: {license.issuing_authority}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:items-end">
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base whitespace-nowrap flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base whitespace-nowrap flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No licenses yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first license or certification</p>
              <Link
                href="/staff-dashboard/my-licenses?action=add"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add New License
              </Link>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}

