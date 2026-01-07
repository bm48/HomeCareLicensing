import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ExpertDashboardLayout from '@/components/ExpertDashboardLayout'
import { 
  Users, 
  Mail, 
  Clock, 
  MapPin, 
  FileText,
  Search,
  Calendar
} from 'lucide-react'

export default async function ExpertClientsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Check if user is an expert
  if (session.profile?.role !== 'expert') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Get expert record
  const { data: expertRecord } = await supabase
    .from('licensing_experts')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  // Get assigned clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('expert_id', session.user.id)
    .order('created_at', { ascending: false })

  // Get cases (license applications) for these clients
  const clientIds = clients?.map(c => c.id) || []
  const { data: cases } = clientIds.length > 0 ? await supabase
    .from('cases')
    .select('*')
    .in('client_id', clientIds)
    .order('started_date', { ascending: false })
    : { data: null }

  // Calculate statistics
  const totalClients = clients?.length || 0
  const activeApplications = cases?.filter(c => 
    c.status === 'in_progress' || c.status === 'under_review'
  ).length || 0
  const pendingReviews = cases?.filter(c => c.status === 'pending' || c.status === 'needs_revision').length || 0

  // Group cases by client
  const casesByClient = cases?.reduce((acc, caseItem) => {
    if (!acc[caseItem.client_id]) {
      acc[caseItem.client_id] = []
    }
    acc[caseItem.client_id].push(caseItem)
    return acc
  }, {} as Record<string, Array<NonNullable<typeof cases>[number]>>) || {}

  // Format date helper
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700'
      case 'needs_revision':
        return 'bg-orange-100 text-orange-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <ExpertDashboardLayout 
      user={session.user} 
      profile={session.profile} 
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">My Clients</h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Manage and support your assigned clients
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Total Clients */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{totalClients}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Clients</div>
          </div>

          {/* Active Applications */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{activeApplications}</div>
            <div className="text-xs sm:text-sm text-gray-600">Active Applications</div>
          </div>

          {/* Pending Reviews */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{pendingReviews}</div>
            <div className="text-xs sm:text-sm text-gray-600">Pending Reviews</div>
          </div>
        </div>

        {/* Clients List */}
        <div className="space-y-4 sm:space-y-6">
          {clients && clients.length > 0 ? (
            clients.map((client) => {
              const clientCases: Array<NonNullable<typeof cases>[number]> = casesByClient[client.id] || []
              return (
                <div key={client.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
                  {/* Client Header */}
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                      {client.company_name}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{client.contact_email}</span>
                      </div>
                      {client.start_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Assigned: {formatDate(client.start_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* License Applications */}
                  {clientCases.length > 0 && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                        License Applications ({clientCases.length})
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        {clientCases.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-gray-50"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {caseItem.business_name} - {caseItem.state}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {caseItem.case_id}
                                  </div>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(caseItem.status)}`}>
                                {caseItem.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">Progress:</span>
                                <span className="font-semibold">{caseItem.progress_percentage}%</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Started: {formatDate(caseItem.started_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <FileText className="w-4 h-4" />
                                <span>{caseItem.documents_count || 0} documents</span>
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-4">
                              <button className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientCases.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No license applications yet</p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 sm:p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients assigned</h3>
              <p className="text-gray-600">You don&apos;t have any assigned clients yet.</p>
            </div>
          )}
        </div>
      </div>
    </ExpertDashboardLayout>
  )
}

