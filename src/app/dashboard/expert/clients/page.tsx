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
  const { data: applicationsData, error: applicationsError } = await supabase
    .from('applications')
    .select('*')
    .eq('assigned_expert_id', session.user.id)
    .order('created_at', { ascending: false })

  if (applicationsError) {
    console.error('Error fetching assigned applications:', applicationsError)
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Calculate statistics
  const totalApplications = (applicationsData || []).length
  const activeApplications = (applicationsData || []).filter(app => 
    app.status === 'in_progress' || app.status === 'under_review'
  ).length
  const pendingReviews = (applicationsData || []).filter(app => 
    app.status === 'under_review' || app.status === 'needs_revision'
  ).length

  return (
    <ExpertDashboardLayout 
      user={{ id: session.user.id, email: session.user.email }} 
      profile={session.profile}
      unreadNotifications={unreadNotifications || 0}
    >
      <ExpertClientsContent 
        applications={applicationsData || []}
        totalApplications={totalApplications}
        activeApplications={activeApplications}
        pendingReviews={pendingReviews}
      />
    </ExpertDashboardLayout>
  )
}
