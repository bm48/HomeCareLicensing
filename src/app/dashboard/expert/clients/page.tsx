import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ExpertDashboardLayout from '@/components/ExpertDashboardLayout'
import ExpertClientsContent from '@/components/ExpertClientsContent'

export default async function ExpertClientsPage() {
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
  // These applications will give us the owners (clients)
  const { data: applicationsData, error: applicationsError } = await supabase
    .from('applications')
    .select('*')
    .eq('assigned_expert_id', session.user.id)
    .order('created_at', { ascending: false })

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Expert clients page - Debug:', {
      applicationsCount: applicationsData?.length || 0,
      applicationsError: applicationsError?.message,
      userId: session.user.id,
      userRole: session.profile?.role,
      applications: applicationsData?.map(app => ({
        id: app.id,
        name: app.application_name,
        owner_id: app.company_owner_id,
        assigned_expert_id: app.assigned_expert_id,
        status: app.status
      }))
    })
  }

  if (applicationsError) {
    console.error('Error fetching assigned applications:', applicationsError)
  }

  // Get unique owner IDs from applications
  const ownerIdArray = (applicationsData?.map(app => app.company_owner_id) || []).filter(Boolean)
  const ownerIds = Array.from(new Set(ownerIdArray))

  // Fetch owner profiles for all unique owner IDs
  const { data: ownerProfiles, error: profilesError } = ownerIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email, created_at')
        .in('id', ownerIds)
    : { data: [], error: null }

  if (profilesError) {
    console.error('Error fetching owner profiles:', profilesError)
  }

  // Debug logging for owner profiles (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Expert clients page - Owner profiles:', {
      ownerIds,
      ownerProfilesCount: ownerProfiles?.length || 0,
      profilesError: profilesError?.message,
      ownerProfiles: ownerProfiles?.map(p => ({ id: p.id, email: p.email, full_name: p.full_name }))
    })
  }

  // Create a map of owner profiles by ID for quick lookup
  const ownerProfilesMap = new Map(
    (ownerProfiles || []).map(profile => [profile.id, profile])
  )

  // Group applications by owner
  // Only include applications with valid company_owner_id
  type ApplicationWithOwner = (NonNullable<typeof applicationsData>[number]) & {
    owner_profile: (NonNullable<typeof ownerProfiles>[number]) | null
  }
  const applicationsByOwner = (applicationsData || []).reduce((acc, app) => {
    const ownerId = app.company_owner_id
    // Skip applications without a valid company_owner_id
    if (!ownerId) {
      console.warn('Application without company_owner_id:', app.id)
      return acc
    }
    if (!acc[ownerId]) {
      acc[ownerId] = []
    }
    acc[ownerId].push({
      ...app,
      owner_profile: ownerProfilesMap.get(ownerId) || null
    } as ApplicationWithOwner)
    return acc
  }, {} as Record<string, ApplicationWithOwner[]>)

  // Debug logging for applicationsByOwner (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Expert clients page - applicationsByOwner:', {
      applicationsByOwnerKeys: Object.keys(applicationsByOwner),
      applicationsByOwnerCount: Object.keys(applicationsByOwner).length,
      applicationsByOwner: Object.keys(applicationsByOwner).reduce((acc, key) => {
        acc[key] = applicationsByOwner[key].length
        return acc
      }, {} as Record<string, number>)
    })
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Calculate statistics
  // Use applicationsByOwner keys count for totalClients to ensure consistency
  const totalClients = Object.keys(applicationsByOwner).length
  const activeApplications = (applicationsData || []).filter(app => 
    app.status === 'in_progress' || app.status === 'under_review'
  ).length
  const pendingReviews = (applicationsData || []).filter(app => 
    app.status === 'under_review' || app.status === 'needs_revision'
  ).length

  // Debug logging for statistics (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Expert clients page - Statistics:', {
      totalClients,
      activeApplications,
      pendingReviews,
      ownerIdsCount: ownerIds.length,
      applicationsByOwnerKeysCount: Object.keys(applicationsByOwner).length
    })
  }

  return (
    <ExpertDashboardLayout 
      user={{ id: session.user.id, email: session.user.email }} 
      profile={session.profile}
      unreadNotifications={unreadNotifications || 0}
    >
      <ExpertClientsContent 
        applicationsByOwner={applicationsByOwner}
        ownerProfiles={ownerProfiles || []}
        totalClients={totalClients}
        activeApplications={activeApplications}
        pendingReviews={pendingReviews}
      />
    </ExpertDashboardLayout>
  )
}
