import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import ClientDetailContent from '@/components/ClientDetailContent'

export default async function ClientDetailPage({
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

  // Get the current client
  const { data: client } = await supabase
    .from('small_clients')
    .select('*')
    .eq('id', id)
    .eq('owner_id', session.user.id)
    .single()

  if (!client) {
    redirect('/dashboard/clients')
  }

  // Get all clients for navigation
  const { data: allClients } = await supabase
    .from('small_clients')
    .select('id, full_name')
    .eq('owner_id', session.user.id)
    .order('full_name', { ascending: true })

  return (
    <DashboardLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <ClientDetailContent 
        client={client} 
        allClients={allClients || []}
      />
    </DashboardLayout>
  )
}
