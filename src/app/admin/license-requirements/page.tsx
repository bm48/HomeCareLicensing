import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  FileText, 
  Plus,
  Trash2
} from 'lucide-react'

export default async function LicenseRequirementsPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get license requirements with steps and documents counts
  const { data: requirements } = await supabase
    .from('license_requirements')
    .select('*')
    .order('state', { ascending: true })
    .order('license_type', { ascending: true })

  // Get steps and documents counts for each requirement
  const requirementIds = requirements?.map(r => r.id) || []
  
  const { data: steps } = requirementIds.length > 0 ? await supabase
    .from('license_requirement_steps')
    .select('license_requirement_id')
    .in('license_requirement_id', requirementIds) : { data: [] }

  const { data: documents } = requirementIds.length > 0 ? await supabase
    .from('license_requirement_documents')
    .select('license_requirement_id')
    .in('license_requirement_id', requirementIds) : { data: [] }

  const stepsByRequirement: Record<string, number> = {}
  steps?.forEach(s => {
    stepsByRequirement[s.license_requirement_id] = (stepsByRequirement[s.license_requirement_id] || 0) + 1
  })

  const docsByRequirement: Record<string, number> = {}
  documents?.forEach(d => {
    docsByRequirement[d.license_requirement_id] = (docsByRequirement[d.license_requirement_id] || 0) + 1
  })

  // Group by state
  const requirementsByState: Record<string, any[]> = {}
  requirements?.forEach(req => {
    if (!requirementsByState[req.state]) {
      requirementsByState[req.state] = []
    }
    requirementsByState[req.state].push(req)
  })

  const states = Object.keys(requirementsByState).sort()

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">License Requirements Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage steps and documents required for each license type in each state.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Panel - License Types */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6">
            <div className="mb-4">
              <select className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>California</option>
                <option>New York</option>
                <option>Texas</option>
                <option>Florida</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-gray-900">License Types</h2>
              <button className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 bg-blue-600 text-white text-xs md:text-sm rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Add Type</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {requirements && requirements.length > 0 ? (
                requirements.map((req) => {
                  const stepCount = stepsByRequirement[req.id] || 0
                  const docCount = docsByRequirement[req.id] || 0

                  return (
                    <div
                      key={req.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{req.license_type}</h3>
                          <p className="text-sm text-gray-600">
                            {stepCount} steps • {docCount} documents
                          </p>
                        </div>
                        <button className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No license types</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Instructions/Empty State */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <FileText className="w-16 h-16 md:w-24 md:h-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">Select a license type to manage requirements</h3>
              <p className="text-sm md:text-base text-gray-500">Choose a license type from the left sidebar to view and edit steps and documents</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

