import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import LicenseDetailContent from '@/components/LicenseDetailContent'

export default async function LicenseDetailPage({
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

  // Get license
  const { data: license } = await supabase
    .from('licenses')
    .select('*')
    .eq('id', id)
    .eq('company_owner_id', session.user.id)
    .single()

  if (!license) {
    redirect('/dashboard/licenses')
  }

  // Get license documents
  const { data: documents } = await supabase
    .from('license_documents')
    .select('*')
    .eq('license_id', id)
    .order('created_at', { ascending: false })

  return (
    <DashboardLayout user={session.user} profile={profile} unreadNotifications={unreadNotifications || 0}>
      <LicenseDetailContent 
        license={license}
        documents={documents || []}
      />
    </DashboardLayout>
  )
}
