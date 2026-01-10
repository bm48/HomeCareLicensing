import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ExpertDashboardLayout from '@/components/ExpertDashboardLayout'
import ExpertApplicationsContent from '@/components/ExpertApplicationsContent'

export default async function ExpertApplicationsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Check if user is an expert
  if (session.profile?.role !== 'expert') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Get all applications assigned to this expert
  // Note: company_owner_id references auth.users(id), not user_profiles directly
  // So we fetch applications and owner profiles separately, then merge them
  const { data: assignedApplicationsData, error: applicationsError } = await supabase
    .from('applications')
    .select('*')
    .eq('assigned_expert_id', session.user.id)
    .in('status', ['under_review', 'needs_revision', 'approved', 'rejected'])
    .order('created_at', { ascending: false })

  // Get unique owner IDs from applications
  const ownerIds = [
    ...new Set((assignedApplicationsData?.map(app => app.company_owner_id) || []).filter(Boolean))
  ]

  // Fetch owner profiles for all unique owner IDs
  const { data: ownerProfiles } = ownerIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', ownerIds)
    : { data: [] }

  // Create a map of owner profiles by ID for quick lookup
  const ownerProfilesMap = new Map(
    (ownerProfiles || []).map(profile => [profile.id, profile])
  )

  // Merge owner profiles with applications
  const assignedApplications = (assignedApplicationsData || []).map(app => ({
    ...app,
    user_profiles: ownerProfilesMap.get(app.company_owner_id) || null
  }))

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  return (
    <ExpertDashboardLayout 
      user={{ id: session.user.id, email: session.user.email }} 
      profile={session.profile}
      unreadNotifications={unreadNotifications || 0}
    >
      <ExpertApplicationsContent 
        applications={assignedApplications || []}
      />
    </ExpertDashboardLayout>
  )
}
