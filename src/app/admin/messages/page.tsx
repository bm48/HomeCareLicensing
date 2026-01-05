import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  MessageSquare, 
  Search
} from 'lucide-react'

export default async function MessagesPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })

  // Get clients and experts separately
  const clientIds = conversations?.map(c => c.client_id).filter(Boolean) || []
  const expertIds = conversations?.map(c => c.expert_id).filter(Boolean) || []

  const { data: clients } = clientIds.length > 0 ? await supabase
    .from('clients')
    .select('id, company_name')
    .in('id', clientIds) : { data: [] }

  const { data: experts } = expertIds.length > 0 ? await supabase
    .from('licensing_experts')
    .select('user_id, first_name, last_name')
    .in('user_id', expertIds) : { data: [] }

  const clientsById: Record<string, any> = {}
  clients?.forEach(c => {
    clientsById[c.id] = c
  })

  const expertsByUserId: Record<string, any> = {}
  experts?.forEach(e => {
    expertsByUserId[e.user_id] = e
  })

  // Get unread message counts per conversation
  const conversationIds = conversations?.map(c => c.id) || []
  const { data: unreadCounts } = conversationIds.length > 0 ? await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false) : { data: [] }

  // Get last message for each conversation
  const lastMessages: Record<string, any> = {}
  if (conversationIds.length > 0) {
    for (const convId of conversationIds) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (messages && messages.length > 0) {
        lastMessages[convId] = messages[0]
      }
    }
  }

  const unreadCountsByConv: Record<string, number> = {}
  unreadCounts?.forEach(msg => {
    unreadCountsByConv[msg.conversation_id] = (unreadCountsByConv[msg.conversation_id] || 0) + 1
  })

  const totalUnread = Object.values(unreadCountsByConv).reduce((acc, count) => acc + count, 0)

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] gap-4">
        {/* Conversations List */}
        <div className="w-full lg:w-96 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                Messages
              </h2>
            </div>
            <p className="text-xs md:text-sm text-gray-600">{totalUnread} unread</p>
          </div>
          
          <div className="p-3 md:p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 md:w-4 md:h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-8 md:pl-10 pr-4 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations && conversations.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {conversations.map((conv) => {
                  const client = clientsById[conv.client_id]
                  const expert = conv.expert_id ? expertsByUserId[conv.expert_id] : null
                  const expertName = expert ? `${expert.first_name} ${expert.last_name}` : 'Unassigned'
                  const lastMessage = lastMessages[conv.id]
                  const unreadCount = unreadCountsByConv[conv.id] || 0

                  return (
                    <div
                      key={conv.id}
                      className="p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                          {getInitials(client?.company_name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">{client?.company_name}</h3>
                            {lastMessage && (
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatDate(lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 truncate">
                            with {expertName} {lastMessage?.content ? lastMessage.content.substring(0, 40) : 'No messages yet'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No conversations</p>
              </div>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="hidden lg:flex flex-1 bg-white rounded-xl shadow-md border border-gray-100 items-center justify-center">
          <div className="text-center p-4">
            <MessageSquare className="w-16 h-16 md:w-24 md:h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">Select a conversation</h3>
            <p className="text-sm md:text-base text-gray-500">Choose a client conversation to view messages.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

