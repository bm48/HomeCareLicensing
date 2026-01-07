import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import StaffManagementClient from '@/components/StaffManagementClient'

export default async function StaffPage() {
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

  // Get all staff members
  const { data: staffMembers } = await supabase
    .from('staff_members')
    .select('*')
    .eq('company_owner_id', session.user.id)
    .order('created_at', { ascending: false })

  // Get all staff licenses
  const { data: allStaffLicenses } = await supabase
    .from('staff_licenses')
    .select('*')
    .in('staff_member_id', staffMembers?.map(s => s.id) || [])

  // Group licenses by staff member
  const licensesByStaff = allStaffLicenses?.reduce((acc: Record<string, typeof allStaffLicenses>, license) => {
    if (!acc[license.staff_member_id]) {
      acc[license.staff_member_id] = []
    }
    acc[license.staff_member_id].push(license)
    return acc
  }, {}) || {}

  // Calculate statistics
  const totalStaff = staffMembers?.length || 0
  const activeStaff = staffMembers?.filter(s => s.status === 'active').length || 0
  
  const today = new Date()
  const expiringLicenses = allStaffLicenses?.filter(sl => {
    if (sl.days_until_expiry) {
      return sl.days_until_expiry <= 30 && sl.days_until_expiry > 0
    }
    return false
  }).length || 0

  // Get staff with expiring licenses count
  const staffWithExpiringLicenses = staffMembers?.map(staff => {
    const licenses = licensesByStaff[staff.id] || []
    const expiringCount = licenses.filter(l => {
      if (l.days_until_expiry) {
        return l.days_until_expiry <= 30 && l.days_until_expiry > 0
      }
      return false
    }).length
    return { ...staff, expiringLicensesCount: expiringCount }
  }) || []

  return (
    <DashboardLayout user={session.user} profile={profile} unreadNotifications={unreadNotifications || 0}>
      <StaffManagementClient
        staffMembers={staffMembers || []}
        licensesByStaff={licensesByStaff}
        totalStaff={totalStaff}
        activeStaff={activeStaff}
        expiringLicenses={expiringLicenses}
        staffWithExpiringLicenses={staffWithExpiringLicenses}
      />
    </DashboardLayout>
  )
}


