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
  Calendar,
  User,
  Bell,
  FolderOpen,
  ArrowRight,
  ChevronRight
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

  // Get staff licenses from applications table
  const { data: applicationsData } = await supabase
    .from('applications')
    .select('*')
    .eq('staff_member_id', staffMember.id)
    .order('expiry_date', { ascending: true })

  // Get application document counts
  const applicationIds = applicationsData?.map(app => app.id) || []
  const { data: applicationDocuments } = applicationIds.length > 0
    ? await supabase
        .from('application_documents')
        .select('application_id')
        .in('application_id', applicationIds)
    : { data: [] }

  const documentCounts = applicationDocuments?.reduce((acc: Record<string, number>, doc) => {
    acc[doc.application_id] = (acc[doc.application_id] || 0) + 1
    return acc
  }, {}) || {}

  // Map applications to match the expected license structure
  const staffLicenses = applicationsData?.map(app => ({
    id: app.id,
    license_type: app.application_name,
    license_number: app.license_number || 'N/A',
    state: app.state,
    status: app.status === 'approved' ? 'active' : app.status === 'rejected' ? 'expired' : 'active',
    issue_date: app.issue_date,
    expiry_date: app.expiry_date,
    days_until_expiry: app.days_until_expiry,
    issuing_authority: app.issuing_authority,
    activated_date: app.issue_date, // Use issue_date as activated_date
    renewal_due_date: app.expiry_date ? (() => {
      // Calculate renewal due date (typically 90 days before expiry)
      const expiry = new Date(app.expiry_date)
      const renewal = new Date(expiry)
      renewal.setDate(renewal.getDate() - 90)
      return renewal.toISOString().split('T')[0]
    })() : null,
    documents_count: documentCounts[app.id] || 0,
  })) || []

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

  // Format date helper (for display in cards)
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Format date for table (MM/DD/YYYY)
  const formatTableDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Get state abbreviation (first 2 letters, uppercase)
  const getStateAbbr = (state: string | null | undefined) => {
    if (!state) return 'N/A'
    return state.substring(0, 2).toUpperCase()
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Licenses</h1>
          
        </div>



        {/* All Licenses & Certifications */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link
              href="/staff-dashboard/my-licenses?action=add"
              className="absolute right-0 inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Add License
            </Link>
          </div>

          {staffLicenses && staffLicenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">STATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">LICENSE NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ACTIVATED DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">EXPIRY DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RENEWAL DUE DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">DOCUMENTS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staffLicenses.map((license) => {
                    const daysUntilExpiry = license.days_until_expiry !== null && license.days_until_expiry !== undefined
                      ? license.days_until_expiry
                      : getDaysUntilExpiry(license.expiry_date)
                    
                    let status = license.status
                    if (status === 'active' && daysUntilExpiry <= 0) {
                      status = 'expired'
                    } else if (status === 'active' && daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
                      status = 'expiring'
                    }

                    return (
                      <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                        {/* STATE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white text-xs font-semibold rounded">
                            {getStateAbbr(license.state)}
                          </span>
                        </td>

                        {/* LICENSE NAME */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{license.license_type}</div>
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black text-white">
                            {status === 'active' ? 'Active' : status === 'expiring' ? 'Expiring Soon' : 'Expired'}
                          </span>
                        </td>

                        {/* ACTIVATED DATE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatTableDate(license.activated_date)}</span>
                          </div>
                        </td>

                        {/* EXPIRY DATE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatTableDate(license.expiry_date)}</span>
                          </div>
                        </td>

                        {/* RENEWAL DUE DATE */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatTableDate(license.renewal_due_date)}</span>
                          </div>
                        </td>

                        {/* DOCUMENTS */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span>{license.documents_count}</span>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Link
                            href={`/staff-dashboard/my-licenses/${license.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View Details
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

        {/* Bottom Cards */}
      </div>
    </StaffLayout>
  )
}

