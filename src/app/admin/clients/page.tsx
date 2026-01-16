import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import ClientListWithFilters from '@/components/ClientListWithFilters'
import { 
  Building2, 
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react'

export default async function ClientsPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all experts to map to clients and for dropdown
  const expertUserIds = clients?.filter(c => c.expert_id).map(c => c.expert_id) || []
  const { data: experts } = expertUserIds.length > 0 ? await supabase
    .from('licensing_experts')
    .select('*')
    .in('user_id', expertUserIds) : { data: [] }
  
  // Get all experts for the dropdown filter
  const { data: allExperts } = await supabase
    .from('licensing_experts')
    .select('*')
    .eq('status', 'active')
    .order('first_name', { ascending: true })
  
  const expertsByUserId: Record<string, any> = {}
  experts?.forEach(e => {
    expertsByUserId[e.user_id] = e
  })

  // Get client states
  const clientIds = clients?.map(c => c.id) || []
  const { data: clientStates } = clientIds.length > 0 ? await supabase
    .from('client_states')
    .select('*')
    .in('client_id', clientIds) : { data: [] }

  // Get unread message counts per client
  const { data: conversations } = clientIds.length > 0 ? await supabase
    .from('conversations')
    .select('id, client_id')
    .in('client_id', clientIds) : { data: [] }

  const conversationIds = conversations?.map(c => c.id) || []
  const { data: messages } = conversationIds.length > 0 ? await supabase
    .from('messages')
    .select('conversation_id, sender_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', user.id) : { data: [] }

  // Group messages by conversation, then by client
  const messagesByConversation: Record<string, number> = {}
  messages?.forEach(m => {
    messagesByConversation[m.conversation_id] = (messagesByConversation[m.conversation_id] || 0) + 1
  })

  const unreadMessagesByClient: Record<string, number> = {}
  conversations?.forEach(conv => {
    const unreadCount = messagesByConversation[conv.id] || 0
    if (unreadCount > 0) {
      unreadMessagesByClient[conv.client_id] = (unreadMessagesByClient[conv.client_id] || 0) + unreadCount
    }
  })

  // Get cases for progress calculation
  const { data: cases } = await supabase
    .from('cases')
    .select('client_id, progress_percentage, status')
    .in('client_id', clientIds)

  // Calculate statistics
  const totalClients = clients?.length || 0
  const activeApplications = cases?.length || 0
  const pendingReview = cases?.filter(c => c.status === 'under_review').length || 0
  const unreadMessagesCount = messages?.length || 0

  // Group states by client
  const statesByClient: Record<string, string[]> = {}
  clientStates?.forEach(cs => {
    if (!statesByClient[cs.client_id]) {
      statesByClient[cs.client_id] = []
    }
    statesByClient[cs.client_id].push(cs.state)
  })

  // Group cases by client
  const casesByClient: Record<string, any[]> = {}
  cases?.forEach(c => {
    if (!casesByClient[c.client_id]) {
      casesByClient[c.client_id] = []
    }
    casesByClient[c.client_id].push(c)
  })


  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <span className="break-words">Client Management</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage and track all client licensing applications</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{totalClients}</div>
            <div className="text-xs md:text-sm text-gray-600">Total Clients</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{activeApplications}</div>
            <div className="text-xs md:text-sm text-gray-600">Active Applications</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{pendingReview}</div>
            <div className="text-xs md:text-sm text-gray-600">Pending Review</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{unreadMessagesCount}</div>
            <div className="text-xs md:text-sm text-gray-600">Unread Messages</div>
          </div>
        </div>

        {/* Client List with Filters */}
        <ClientListWithFilters
          clients={clients || []}
          expertsByUserId={expertsByUserId}
          allExperts={allExperts || []}
          statesByClient={statesByClient}
          casesByClient={casesByClient}
          unreadMessagesByClient={unreadMessagesByClient}
        />
      </div>
    </AdminLayout>
  )
}

