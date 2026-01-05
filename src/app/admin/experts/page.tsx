import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  Users, 
  CheckCircle2,
  Briefcase,
  Search,
  Mail,
  Phone,
  MapPin,
  Plus,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

export default async function ExpertsPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all experts with their states
  const { data: experts } = await supabase
    .from('licensing_experts')
    .select('*')
    .order('created_at', { ascending: false })

  // Get expert states
  const expertIds = experts?.map(e => e.id) || []
  const { data: expertStates } = expertIds.length > 0 ? await supabase
    .from('expert_states')
    .select('*')
    .in('expert_id', expertIds) : { data: [] }

  // Get client counts per expert
  const { data: clients } = await supabase
    .from('clients')
    .select('expert_id')
    .in('expert_id', expertIds.filter(id => id !== null))

  // Calculate statistics
  const totalExperts = experts?.length || 0
  const activeExperts = experts?.filter(e => e.status === 'active').length || 0
  const assignedClients = clients?.length || 0

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
  clients?.forEach(c => {
    if (c.expert_id) {
      clientsByExpert[c.expert_id] = (clientsByExpert[c.expert_id] || 0) + 1
    }
  })

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              <span className="break-words">Licensing Experts</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage your team of licensing consultants and specialists.</p>
          </div>
          <Link
            href="/admin/experts/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm md:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Add Expert
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{totalExperts}</div>
            <div className="text-xs md:text-sm text-gray-600">Total Experts</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{activeExperts}</div>
            <div className="text-xs md:text-sm text-gray-600">Active Experts</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{assignedClients}</div>
            <div className="text-xs md:text-sm text-gray-600">Assigned Clients</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search experts by name, email, or expertise..."
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
              </select>
            </div>
          </div>
        </div>

        {/* Expert List */}
        <div className="space-y-4">
          {experts && experts.length > 0 ? (
            experts.map((expert) => {
              const expertStatesList = statesByExpert[expert.id] || []
              const clientCount = clientsByExpert[expert.id] || 0

              return (
                <div key={expert.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-lg flex-shrink-0">
                        {getInitials(expert.first_name, expert.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{expert.first_name} {expert.last_name}</h3>
                          <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full whitespace-nowrap">
                            {expert.status}
                          </span>
                        </div>
                        <div className="text-sm md:text-base text-gray-600 mb-3">{expert.role}</div>
                        <div className="space-y-1 text-xs md:text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="break-all">{expert.email}</span>
                          </div>
                          {expert.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              <span>{expert.phone}</span>
                            </div>
                          )}
                          {expertStatesList.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              <span className="text-gray-700 font-medium">Specialization:</span>
                              {expertStatesList.map(state => (
                                <span key={state} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  {state}
                                </span>
                              ))}
                            </div>
                          )}
                          {expert.expertise && (
                            <div className="mt-2">
                              <span className="text-gray-700 font-medium">Expertise: </span>
                              <span className="text-gray-600 break-words">{expert.expertise}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Briefcase className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>{clientCount} Clients</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-xl p-8 md:p-12 text-center shadow-md border border-gray-100">
              <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No experts found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

