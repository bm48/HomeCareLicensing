import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ApplicationDetailWrapper from '@/components/ApplicationDetailWrapper'

export default async function ApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params
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

  // Get application - allow both owners and assigned experts to view
  const { data: application } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .or(`company_owner_id.eq.${session.user.id},assigned_expert_id.eq.${session.user.id}`)
    .single()

  if (!application) {
    // Check if user is expert and redirect to expert dashboard, otherwise regular dashboard
    if (profile?.role === 'expert') {
      redirect('/dashboard/expert/clients')
    } else {
      redirect('/dashboard/licenses')
    }
  }

  // Get application documents
  const { data: documents } = await supabase
    .from('application_documents')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false })

  return (
    <ApplicationDetailWrapper
      application={application}
      documents={documents || []}
      user={session.user}
      profile={profile}
      unreadNotifications={unreadNotifications || 0}
    />
  )
}

