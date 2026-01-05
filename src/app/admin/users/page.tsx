import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  Users, 
  CheckCircle2,
  XCircle,
  Building2,
  Search,
  Settings,
  UserX,
  UserCheck
} from 'lucide-react'

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
  const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get user counts
  const totalUsers = userProfiles?.length || 0
  const activeUsers = userProfiles?.filter(u => u.role !== 'admin' || true).length || 0 // All users are considered active for now
  const disabledUsers = 0 // We don't have a disabled status in user_profiles
  const companies = new Set(userProfiles?.map(u => u.email?.split('@')[1]).filter(Boolean)).size

  // Get license counts per user (from applications table - simplified)
  // In a real app, you'd have a proper relationship
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="px-2 py-1 bg-black text-white text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 bg-white rounded-full"></span>
          admin
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
        user
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          active
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        disabled
      </span>
    )
  }

  // Extract company from email domain (simplified)
  const getCompanyFromEmail = (email: string) => {
    const domain = email.split('@')[1]
    if (!domain) return 'N/A'
    // Convert domain to company name (simplified)
    return domain.split('.')[0].split('').map((c, i) => i === 0 ? c.toUpperCase() : c).join('') + ' Care'
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
            <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <span className="break-words">User Management</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{totalUsers}</div>
            <div className="text-xs md:text-sm text-gray-600">All registered users</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{activeUsers}</div>
            <div className="text-xs md:text-sm text-gray-600">Currently enabled</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{disabledUsers}</div>
            <div className="text-xs md:text-sm text-gray-600">Access revoked</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{companies}</div>
            <div className="text-xs md:text-sm text-gray-600">Unique organizations</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search by name, email, company, or ID..."
                className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <button className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                <Building2 className="w-3 h-3 md:w-4 md:h-4" />
                Group by Company
              </button>
              <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Companies</option>
              </select>
              <select className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User ID</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name & Email</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Company</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Licenses</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userProfiles && userProfiles.length > 0 ? (
                  userProfiles.map((userProfile, index) => {
                    const isActive = true // All users are active for now
                    const userID = `USR-${String(index + 1).padStart(3, '0')}`
                    const companyName = getCompanyFromEmail(userProfile.email)

                    return (
                      <tr key={userProfile.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">{userID}</td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-xs md:text-sm font-medium text-gray-900">{userProfile.full_name || 'N/A'}</div>
                            <div className="text-xs md:text-sm text-gray-500 break-all">{userProfile.email}</div>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                            <span className="text-xs md:text-sm text-gray-900">{companyName}</span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(userProfile.role)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(isActive)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden md:table-cell">
                          {userProfile.role === 'company_owner' ? '1' : '0'}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden lg:table-cell">
                          {formatDate(userProfile.updated_at)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <button className="text-red-600 hover:text-red-800" title="Disable">
                                <UserX className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            ) : (
                              <button className="text-green-600 hover:text-green-800" title="Enable">
                                <UserCheck className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-800" title="Settings">
                              <Settings className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No users found
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

