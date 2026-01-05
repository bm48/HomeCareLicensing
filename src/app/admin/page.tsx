import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Search,
  Download,
  Filter,
  LayoutDashboard
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all cases
  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')

  // Calculate statistics
  const totalCases = cases?.length || 0
  const inProgress = cases?.filter(c => c.status === 'in_progress').length || 0
  const inReview = cases?.filter(c => c.status === 'under_review').length || 0
  const completed = cases?.filter(c => c.status === 'approved').length || 0
  const avgProgress = cases && cases.length > 0
    ? Math.round(cases.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / cases.length)
    : 0

  // Cases by status for pie chart
  const statusCounts = {
    in_progress: cases?.filter(c => c.status === 'in_progress').length || 0,
    under_review: cases?.filter(c => c.status === 'under_review').length || 0,
    approved: cases?.filter(c => c.status === 'approved').length || 0,
    rejected: cases?.filter(c => c.status === 'rejected').length || 0,
  }

  // Cases by state for bar chart
  const stateCounts: Record<string, number> = {}
  cases?.forEach(caseItem => {
    stateCounts[caseItem.state] = (stateCounts[caseItem.state] || 0) + 1
  })

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <span className="break-words">Admin Dashboard</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Monitor and manage all licensing cases</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{totalCases}</div>
            <div className="text-xs md:text-sm text-gray-600">All time</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{inProgress}</div>
            <div className="text-xs md:text-sm text-gray-600">Active cases</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{inReview}</div>
            <div className="text-xs md:text-sm text-gray-600">Pending approval</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{completed}</div>
            <div className="text-xs md:text-sm text-gray-600">Successfully licensed</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{avgProgress}%</div>
            <div className="text-xs md:text-sm text-gray-600">Across all cases</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Cases by Status Pie Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Cases by Status</h2>
            <div className="flex items-center justify-center h-48 md:h-64">
              <div className="relative w-48 h-48">
                {/* Simple pie chart using SVG */}
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                  />
                  {totalCases > 0 && (
                    <>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="20"
                        strokeDasharray={`${(statusCounts.in_progress / totalCases) * 251.2} 251.2`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="20"
                        strokeDasharray={`${(statusCounts.approved / totalCases) * 251.2} 251.2`}
                        strokeDashoffset={`-${(statusCounts.in_progress / totalCases) * 251.2}`}
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="20"
                        strokeDasharray={`${(statusCounts.under_review / totalCases) * 251.2} 251.2`}
                        strokeDashoffset={`-${((statusCounts.in_progress + statusCounts.approved) / totalCases) * 251.2}`}
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalCases}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">In Progress ({statusCounts.in_progress})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Approved ({statusCounts.approved})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">Under Review ({statusCounts.under_review})</span>
              </div>
            </div>
          </div>

          {/* Cases by State Bar Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Cases by State</h2>
            <div className="h-48 md:h-64 flex items-end justify-center gap-2 md:gap-4 overflow-x-auto pb-2">
              {Object.entries(stateCounts).length > 0 ? (
                Object.entries(stateCounts).map(([state, count]) => {
                  const maxCount = Math.max(...Object.values(stateCounts))
                  const height = (count / maxCount) * 100
                  return (
                    <div key={state} className="flex flex-col items-center gap-2">
                      <div className="relative w-12 bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: '20px' }}>
                        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-900">
                          {count}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{state}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Case Management Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                <input
                  type="text"
                  placeholder="Search by case ID, business name, or owner..."
                  className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Statuses</option>
                  <option>In Progress</option>
                  <option>Under Review</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
                <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All States</option>
                  <option>CA</option>
                  <option>NY</option>
                  <option>TX</option>
                  <option>FL</option>
                </select>
                <button className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm md:text-base bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Case ID</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Business Name</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Owner</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">State</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Progress</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Documents</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Steps</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">Last Activity</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases && cases.length > 0 ? (
                  cases.map((caseItem) => (
                    <tr key={caseItem.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">{caseItem.case_id}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">{caseItem.business_name}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden sm:table-cell">{caseItem.owner_name}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600">{caseItem.state}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          caseItem.status === 'approved' ? 'bg-green-100 text-green-800' :
                          caseItem.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                          caseItem.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {caseItem.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="w-20 md:w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${caseItem.progress_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 mt-1 block">{caseItem.progress_percentage || 0}%</span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden lg:table-cell">{caseItem.documents_count || 0}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden lg:table-cell">{caseItem.steps_count || 0}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden xl:table-cell">{formatDate(caseItem.last_activity)}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

