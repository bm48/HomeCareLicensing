import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import LicensesContent from '@/components/LicensesContent'

export default async function LicensesPage() {
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

  // Get all licenses
  const { data: licenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('company_owner_id', session.user.id)
    .order('expiry_date', { ascending: true })

  // Get license documents count
  const { data: licenseDocuments } = await supabase
    .from('license_documents')
    .select('license_id')

  const documentCounts = licenseDocuments?.reduce((acc: Record<string, number>, doc) => {
    acc[doc.license_id] = (acc[doc.license_id] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <DashboardLayout user={session.user} profile={profile} unreadNotifications={unreadNotifications || 0}>
      <LicensesContent 
        licenses={licenses || []} 
        documentCounts={documentCounts}
      />
    </DashboardLayout>
  )
}

