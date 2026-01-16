import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import ClientMessagesContent from '@/components/ClientMessagesContent'
import { MessageSquare } from 'lucide-react'

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  try {
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
    redirect('/dashboard/expert/messages')
  }

  // Get client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, expert_id')
    .eq('company_owner_id', session.user.id)
    .single()

  if (clientError || !client) {

    // If client doesn't exist, show a message to the user
    // They need to be added as a client first
    return (
      <DashboardLayout 
        user={session.user} 
        profile={profile} 
        unreadNotifications={0}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Client Record Found</h3>
            <p className="text-sm text-gray-500">
              Please contact the administrator to set up your client account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  // Get conversations for this client (only if client exists)
  const { data: conversations } = client ? await supabase
    .from('conversations')
    .select('id, client_id, expert_id, admin_id, last_message_at, created_at, updated_at')
    .eq('client_id', client.id)
    .order('last_message_at', { ascending: false }) : { data: [] }

  // Get admin user ID (first admin user)
  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  const adminUserId = adminProfile?.id || null

  // Get unread message counts per conversation
  const conversationIds = conversations?.map(c => c.id) || []
  const { data: unreadCounts } = conversationIds.length > 0 ? await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', session.user.id) : { data: [] }

  const unreadCountsByConv: Record<string, number> = {}
  unreadCounts?.forEach(msg => {
    unreadCountsByConv[msg.conversation_id] = (unreadCountsByConv[msg.conversation_id] || 0) + 1
  })

  // Prepare conversations with related data
  // Only show existing conversations - do not auto-create
  const conversationsWithData: Array<{
    id: string
    client_id: string
    expert_id: string | null
    last_message_at: string
    expert?: any
    unread_count: number
    conversation_type: 'admin' | 'expert'
  }> = []

  // Get expert records for conversations that have experts
  const expertRecordIds = conversations?.map(c => c.expert_id).filter(Boolean) || []
  const { data: expertRecords } = expertRecordIds.length > 0 ? await supabase
    .from('licensing_experts')
    .select('id, user_id, first_name, last_name')
    .in('id', expertRecordIds) : { data: [] }

  const expertsById: Record<string, any> = {}
  expertRecords?.forEach(e => {
    expertsById[e.id] = e
  })

  // Process existing conversations only
  conversations?.forEach(conv => {
    if (conv.admin_id && !conv.expert_id) {
      // Admin conversation
      conversationsWithData.push({
        id: conv.id,
        client_id: conv.client_id,
        expert_id: null,
        last_message_at: conv.last_message_at,
        expert: null,
        unread_count: unreadCountsByConv[conv.id] || 0,
        conversation_type: 'admin'
      })
    } else if (conv.expert_id && !conv.admin_id) {
      // Expert conversation
      const expertRecord = expertsById[conv.expert_id]
      if (expertRecord) {
        conversationsWithData.push({
          id: conv.id,
          client_id: conv.client_id,
          expert_id: conv.expert_id,
          last_message_at: conv.last_message_at,
          expert: {
            user_id: expertRecord.user_id,
            first_name: expertRecord.first_name,
            last_name: expertRecord.last_name
          },
          unread_count: unreadCountsByConv[conv.id] || 0,
          conversation_type: 'expert'
        })
      }
    }
  })

  // Sort by last_message_at
  conversationsWithData.sort((a, b) => {
    const dateA = new Date(a.last_message_at).getTime()
    const dateB = new Date(b.last_message_at).getTime()
    return dateB - dateA
  })

  return (
    <DashboardLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <ClientMessagesContent 
        initialConversations={conversationsWithData}
        userId={session.user.id}
        clientId={client?.id || ''}
        adminUserId={adminUserId || undefined}
      />
    </DashboardLayout>
    )
  } catch (error) {
    console.error('Error in MessagesPage:', error)
    return (
      <DashboardLayout 
        user={{ id: '', email: null }} 
        profile={null} 
        unreadNotifications={0}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Error Loading Messages</h3>
            <p className="text-sm text-gray-500">
              An error occurred while loading the messages page. Please try again later.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
}
