import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import UserManagementTabs from '@/components/UserManagementTabs'
import { Users } from 'lucide-react'

export default async function UsersPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all user profiles
  const { data: userProfilesRaw } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get exact company name for agency admins (company_owner) from clients table
  const companyOwnerIds = userProfilesRaw?.filter(u => u.role === 'company_owner').map(u => u.id) || []
  const { data: clientCompanies } = companyOwnerIds.length > 0 ? await supabase
    .from('clients')
    .select('company_owner_id, company_name')
    .in('company_owner_id', companyOwnerIds)
    : { data: [] }
  const companyNameByUserId: Record<string, string> = {}
  clientCompanies?.forEach(c => {
    if (c.company_owner_id && c.company_name?.trim()) {
      companyNameByUserId[c.company_owner_id] = c.company_name.trim()
    }
  })
  const userProfiles = (userProfilesRaw || []).map(p => ({
    ...p,
    company_name: p.role === 'company_owner' ? (companyNameByUserId[p.id] ?? null) : null,
  }))

  // Get user counts
  const totalUsers = userProfiles?.length || 0
  const activeUsers = userProfiles?.filter(u => u.role !== 'admin' || true).length || 0
  const disabledUsers = 0
  const companies = new Set(userProfiles?.map(u => (u as { company_name?: string | null }).company_name).filter(Boolean)).size

  // Get all clients data
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
    .eq('is_read', false) : { data: [] }

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

  // Calculate client statistics
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

  // Get all experts with their states
  const { data: allExpertsData } = await supabase
    .from('licensing_experts')
    .select('*')
    .order('created_at', { ascending: false })

  // Get expert states
  const expertIds = allExpertsData?.map(e => e.id) || []
  const { data: expertStates } = expertIds.length > 0 ? await supabase
    .from('expert_states')
    .select('*')
    .in('expert_id', expertIds) : { data: [] }

  // Get client counts per expert
  const { data: expertClients } = await supabase
    .from('clients')
    .select('expert_id')
    .in('expert_id', expertIds.filter(id => id !== null))

  // Calculate expert statistics
  const totalExperts = allExpertsData?.length || 0
  const activeExperts = allExpertsData?.filter(e => e.status === 'active').length || 0
  const assignedClients = expertClients?.length || 0

  // Group states by expert
  const statesByExpert: Record<string, string[]> = {}
  expertStates?.forEach(es => {
    if (!statesByExpert[es.expert_id]) {
      statesByExpert[es.expert_id] = []
    }
    statesByExpert[es.expert_id].push(es.state)
  })

  // Count clients per expert
  const clientsByExpert: Record<string, number> = {}
  expertClients?.forEach(c => {
    if (c.expert_id) {
      clientsByExpert[c.expert_id] = (clientsByExpert[c.expert_id] || 0) + 1
    }
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <span className="break-words">User Management</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage users, clients, and licensing experts</p>
        </div>

        {/* Tabbed Content */}
        <UserManagementTabs
          userProfiles={userProfiles || []}
          totalUsers={totalUsers}
          activeUsers={activeUsers}
          disabledUsers={disabledUsers}
          companies={companies}
          clients={clients || []}
          expertsByUserId={expertsByUserId}
          allExperts={allExperts || []}
          statesByClient={statesByClient}
          casesByClient={casesByClient}
          unreadMessagesByClient={unreadMessagesByClient}
          totalClients={totalClients}
          activeApplications={activeApplications}
          pendingReview={pendingReview}
          unreadMessagesCount={unreadMessagesCount}
          experts={allExpertsData || []}
          statesByExpert={statesByExpert}
          clientsByExpert={clientsByExpert}
          totalExperts={totalExperts}
          activeExperts={activeExperts}
          assignedClients={assignedClients}
        />
      </div>
    </AdminLayout>
  )
}

