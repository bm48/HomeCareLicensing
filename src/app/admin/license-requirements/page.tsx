import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import LicenseTypesTable from '@/components/LicenseTypesTable'

export default async function LicenseRequirementsPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get all license types with processing time fields
  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('id, state, name, description, cost_display, service_fee_display, processing_time_display, processing_time_min, processing_time_max, renewal_period_display, is_active')
    .order('state', { ascending: true })
    .order('name', { ascending: true })

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">License Requirements Management</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage steps and documents required for each license type in each state.</p>
          </div>
        </div>

        {/* License Types Table */}
        <LicenseTypesTable licenseTypes={licenseTypes || []} />
      </div>
    </AdminLayout>
  )
}
