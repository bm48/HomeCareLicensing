import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import AdminMessagesContent from '@/components/AdminMessagesContent'

export default async function MessagesPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get conversations where admin is a participant
  // RLS allows admins to view all conversations, but we filter to only admin conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('admin_id', user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  // Get clients and experts separately
  const clientIds = conversations?.map(c => c.client_id).filter(Boolean) || []
  const expertIds = conversations?.map(c => c.expert_id).filter(Boolean) || []

  const { data: clients } = clientIds.length > 0 ? await supabase
    .from('clients')
    .select('id, company_name')
    .in('id', clientIds) : { data: [] }

  const { data: experts } = expertIds.length > 0 ? await supabase
    .from('licensing_experts')
    .select('id, user_id, first_name, last_name')
    .in('id', expertIds) : { data: [] }

  const clientsById: Record<string, any> = {}
  clients?.forEach(c => {
    clientsById[c.id] = c
  })

  const expertsById: Record<string, any> = {}
  experts?.forEach(e => {
    expertsById[e.id] = e
  })

  // Get unread message counts per conversation (exclude messages sent by admin)
  const conversationIds = conversations?.map(c => c.id) || []
  const { data: unreadCounts } = conversationIds.length > 0 ? await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', user.id) : { data: [] }

  const unreadCountsByConv: Record<string, number> = {}
  unreadCounts?.forEach(msg => {
    unreadCountsByConv[msg.conversation_id] = (unreadCountsByConv[msg.conversation_id] || 0) + 1
  })

  // Prepare conversations with related data
  // Only include conversations that actually exist and have a client
  const conversationsWithData = (conversations || [])
    .filter(conv => conv.client_id && clientsById[conv.client_id]) // Only show if client exists
    .map(conv => ({
      id: conv.id,
      client_id: conv.client_id,
      expert_id: conv.expert_id,
      admin_id: conv.admin_id,
      last_message_at: conv.last_message_at,
      client: clientsById[conv.client_id],
      expert: conv.expert_id ? expertsById[conv.expert_id] : null,
      unread_count: unreadCountsByConv[conv.id] || 0
    }))

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <AdminMessagesContent 
        initialConversations={conversationsWithData}
        userId={user.id}
      />
    </AdminLayout>
  )
}

