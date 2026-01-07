import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  Building2, 
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Filter,
  Mail,
  User,
  MapPin,
  Calendar,
  MoreVertical
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

  // Get all experts to map to clients
  const expertUserIds = clients?.filter(c => c.expert_id).map(c => c.expert_id) || []
  const { data: experts } = expertUserIds.length > 0 ? await supabase
    .from('licensing_experts')
    .select('*')
    .in('user_id', expertUserIds) : { data: [] }
  
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
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .in('client_id', clientIds)

  const conversationIds = conversations?.map(c => c.id) || []
  const { data: messages } = conversationIds.length > 0 ? await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false) : { data: [] }

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

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search clients by company name, contact, or email..."
                className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All States</option>
                <option>CA</option>
                <option>NY</option>
                <option>TX</option>
                <option>FL</option>
              </select>
              <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </select>
              <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Experts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className="space-y-4">
          {clients && clients.length > 0 ? (
            clients.map((client) => {
              const expert = client.expert_id ? expertsByUserId[client.expert_id] : null
              const expertName = expert ? `${expert.first_name} ${expert.last_name}` : 'Unassigned'
              const clientStatesList = statesByClient[client.id] || []
              const clientCases = casesByClient[client.id] || []
              const avgProgress = clientCases.length > 0
                ? Math.round(clientCases.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / clientCases.length)
                : 0

              return (
                <div key={client.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base flex-shrink-0">
                        {getInitials(client.company_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{client.company_name}</h3>
                          <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full whitespace-nowrap">
                            {client.status}
                          </span>
                          <span className="px-2 md:px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full whitespace-nowrap">
                            2 New Messages
                          </span>
                        </div>
                        <div className="space-y-1 text-xs md:text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="break-all">Contact: {client.contact_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="break-all">{client.contact_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>Expert: {expertName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>Started: {formatDate(client.start_date)}</span>
                          </div>
                          {clientStatesList.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              {clientStatesList.map(state => (
                                <span key={state} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {state}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {avgProgress > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs md:text-sm text-gray-600">Application Progress</span>
                              <span className="text-xs md:text-sm font-semibold text-gray-900">{avgProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gray-800 h-2 rounded-full" 
                                style={{ width: `${avgProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 md:gap-2">
                      <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs md:text-sm font-medium">
                        <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                        <span>Messages</span>
                        <span className="px-1.5 md:px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">2</span>
                      </button>
                      <button className="px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs md:text-sm font-medium whitespace-nowrap">
                        View Application
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-xl p-8 md:p-12 text-center shadow-md border border-gray-100">
              <Building2 className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No clients found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

