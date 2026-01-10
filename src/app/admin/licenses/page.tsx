import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import AdminLicensesContent from '@/components/AdminLicensesContent'

export default async function AdminLicensesPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all applications with status 'requested' (new application requests)
  // Note: Admin can view all applications due to RLS policy "Admins can view all applications"
  // Note: company_owner_id references auth.users(id), not user_profiles directly
  // So we fetch applications and owner profiles separately, then merge them
  const { data: requestedApplicationsData, error: requestedError } = await supabase
    .from('applications')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false })

  // Get all applications with status 'in_progress', 'under_review', 'needs_revision', 'approved', 'rejected'
  const { data: allApplicationsData, error: allAppsError } = await supabase
    .from('applications')
    .select('*')
    .in('status', ['in_progress', 'under_review', 'needs_revision', 'approved', 'rejected'])
    .order('created_at', { ascending: false })

  // Get unique owner IDs from both application sets
  const requestedOwnerIds = requestedApplicationsData?.map(app => app.company_owner_id) || []
  const allOwnerIds = allApplicationsData?.map(app => app.company_owner_id) || []
  const ownerIds = Array.from(new Set(requestedOwnerIds.concat(allOwnerIds)))

  // Fetch owner profiles for all unique owner IDs
  const { data: ownerProfiles, error: profilesError } = ownerIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', ownerIds)
    : { data: [], error: null }

  // Create a map of owner profiles by ID for quick lookup
  const ownerProfilesMap = new Map(
    (ownerProfiles || []).map(profile => [profile.id, profile])
  )

  // Merge owner profiles with applications
  const requestedApplications = (requestedApplicationsData || []).map(app => ({
    ...app,
    user_profiles: ownerProfilesMap.get(app.company_owner_id) || null
  }))

  const allApplications = (allApplicationsData || []).map(app => ({
    ...app,
    user_profiles: ownerProfilesMap.get(app.company_owner_id) || null
  }))

  // Log errors if any (for debugging)
  if (requestedError) {
    console.error('Error fetching requested applications:', requestedError)
  }
  if (allAppsError) {
    console.error('Error fetching all applications:', allAppsError)
  }
  if (profilesError) {
    console.error('Error fetching owner profiles:', profilesError)
  }

  // Debug: Log query results (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin licenses page - Query results:', {
      requestedCount: requestedApplications?.length || 0,
      allCount: allApplications?.length || 0,
      requestedError: requestedError?.message,
      allAppsError: allAppsError?.message,
      profilesError: profilesError?.message,
      userRole: profile?.role,
      userId: user.id
    })
  }

  // Get all experts from user_profiles where role = 'expert'
  // Note: user_profiles.id is the user_id (references auth.users), which is what assigned_expert_id stores
  const { data: expertsData, error: expertsError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('role', 'expert')
    .order('created_at', { ascending: false })

  // Transform experts data to match the component interface
  // Split full_name into first_name and last_name for display
  const experts = (expertsData || []).map(expert => {
    const nameParts = (expert.full_name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    return {
      id: expert.id, // This is the user_id (auth.users.id), same as what assigned_expert_id stores
      user_id: expert.id, // Keep for compatibility with existing component logic
      first_name: firstName,
      last_name: lastName,
      email: expert.email,
      status: 'active' // All experts from user_profiles are considered active
    }
  })

  // Log errors if any (for debugging)
  if (expertsError) {
    console.error('Error fetching experts:', expertsError)
  }

  // Debug: Log experts query results (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin licenses page - Experts query results:', {
      expertsCount: experts?.length || 0,
      expertsError: expertsError?.message,
      experts: experts?.map(e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name, email: e.email }))
    })
  }

  return (
    <AdminLayout 
      user={{ id: user.id, email: user.email }} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <AdminLicensesContent 
        requestedApplications={requestedApplications || []}
        allApplications={allApplications || []}
        experts={experts || []}
      />
    </AdminLayout>
  )
}
