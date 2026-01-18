import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import ConfigurationContent from '@/components/ConfigurationContent'

export default async function ConfigurationPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get current pricing (most recent effective pricing)
  const { getCurrentPricing } = await import('@/app/actions/pricing')
  const pricingResult = await getCurrentPricing()
  const pricingData = pricingResult.data
  // Get all license types
  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('id, name, state, renewal_period_display, cost_display, service_fee_display, processing_time_display')
    .eq('is_active', true)
    .order('state', { ascending: true })
    .order('name', { ascending: true })

  // Get system lists data
  const { getCertificationTypes, getStaffRoles } = await import('@/app/actions/system-lists')
  
  const certTypesResult = await getCertificationTypes()
  const certificationTypes = certTypesResult.data || []
  
  
  const rolesResult = await getStaffRoles()
  const staffRoles = rolesResult.data || []

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <ConfigurationContent
        initialPricing={pricingData || { owner_admin_license: 50, staff_license: 25 }}
        licenseTypes={licenseTypes || []}
        certificationTypes={certificationTypes}
        staffRoles={staffRoles}
      />
    </AdminLayout>
  )
}
