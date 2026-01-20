import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import AdminApplicationDetailContent from '@/components/AdminApplicationDetailContent'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AdminApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { user, profile } = await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  // Fetch application first, then fetch related data
  const [
    { count: unreadNotifications },
    { data: application },
    { data: documents }
  ] = await Promise.all([
    // Get unread notifications count
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    // Get application
    supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single(),
    // Get application documents
    supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false })
  ])

  if (!application) {
    redirect('/admin/licenses')
  }

  // Fetch owner and expert profiles in parallel
  const [
    { data: ownerProfile },
    { data: expertProfile }
  ] = await Promise.all([
    // Get owner profile if company_owner_id exists
    application.company_owner_id
      ? supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', application.company_owner_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    // Get expert profile if assigned_expert_id exists
    application.assigned_expert_id
      ? supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', application.assigned_expert_id)
          .single()
      : Promise.resolve({ data: null, error: null })
  ])

  // Merge owner profile with application
  const applicationWithOwner = {
    ...application,
    user_profiles: ownerProfile || null,
    expert_profile: expertProfile
  }

  return (
    <AdminLayout 
      user={{ id: user.id, email: user.email }} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-6">
        <Link
          href="/admin/licenses"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to License Applications
        </Link>
        <AdminApplicationDetailContent
          application={applicationWithOwner}
          documents={documents || []}
        />
      </div>
    </AdminLayout>
  )
}
