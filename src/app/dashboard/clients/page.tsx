import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import ClientsContent from '@/components/ClientsContent'

export default async function ClientsPage() {
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

  // Redirect based on role
  if (profile?.role === 'admin') {
    redirect('/admin')
  }
  
  if (profile?.role === 'expert') {
    redirect('/dashboard/expert/clients')
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Get all clients for this owner
  const { data: clients } = await supabase
    .from('small_clients')
    .select('*')
    .eq('owner_id', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <ClientsContent clients={clients || []} />
    </DashboardLayout>
  )
}
