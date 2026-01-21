import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ExpertDashboardLayout from '@/components/ExpertDashboardLayout'
import ApplicationDetailContent from '@/components/ApplicationDetailContent'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ExpertApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Check if user is an expert
  if (session.profile?.role !== 'expert') {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Get application - only if assigned to this expert
  const { data: application } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('assigned_expert_id', session.user.id)
    .single()

  if (!application) {
    redirect('/dashboard/expert/clients')
  }

  // Get application documents
  const { data: documents } = await supabase
    .from('application_documents')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false })

  return (
    <ExpertDashboardLayout 
      user={{ id: session.user.id, email: session.user.email }} 
      profile={session.profile}
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-6 mt-[6rem]">
        <Link
          href="/dashboard/expert/clients"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Clients
        </Link>
        <ApplicationDetailContent
          application={application}
          documents={documents || []}
        />
      </div>
    </ExpertDashboardLayout>
  )
}
