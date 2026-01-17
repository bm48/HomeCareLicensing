import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StaffLayout from '@/components/StaffLayout'
import StaffLicenseDetailContent from '@/components/StaffLicenseDetailContent'

export default async function StaffLicenseDetailPage({
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
  if (id) {
    console.log("paramsid: ",id)
  }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Verify user has staff_member role
  if (profile.role !== 'staff_member') {
    redirect('/login?error=Access denied. Staff member role required.')
  }

  // Get staff member record
  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!staffMember) {
    redirect('/login?error=Staff member record not found.')
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Get application (license) - must belong to this staff member
  console.log("staffMember: ",staffMember)
  const { data: application } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('staff_member_id', staffMember.id)
    .single()

  if (!application) {
    redirect('/staff-dashboard/my-licenses')
  }

  // Get application documents
  const { data: documents } = await supabase
    .from('application_documents')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false })

  // Map application to license format for the component
  const license = {
    id: application.id,
    license_name: application.application_name,
    license_type: application.application_name,
    license_number: application.license_number || null,
    state: application.state,
    status: application.status === 'approved' ? 'active' : application.status === 'rejected' ? 'expired' : 'active',
    activated_date: application.issue_date,
    expiry_date: application.expiry_date,
    renewal_due_date: application.expiry_date ? (() => {
      const expiry = new Date(application.expiry_date)
      const renewal = new Date(expiry)
      renewal.setDate(renewal.getDate() - 90)
      return renewal.toISOString().split('T')[0]
    })() : null,
    issue_date: application.issue_date,
    days_until_expiry: application.days_until_expiry,
    issuing_authority: application.issuing_authority,
    created_at: application.created_at,
    updated_at: application.updated_at,
  }

  return (
    <StaffLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <StaffLicenseDetailContent 
        license={license}
        documents={documents || []}
      />
    </StaffLayout>
  )
}
