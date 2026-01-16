import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import LicenseTypeDetails from '@/components/LicenseTypeDetails'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function LicenseRequirementDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()
  const { id } = await params

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get license type details
  const { data: licenseType, error } = await supabase
    .from('license_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !licenseType) {
    redirect('/admin/license-requirements')
  }

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Back Button */}
        <Link
          href="/admin/license-requirements"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to License Requirements
        </Link>

        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{licenseType.name}</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {licenseType.state} • {licenseType.description || 'No description'}
          </p>
        </div>

        {/* License Type Details */}
        <LicenseTypeDetails 
          licenseType={{
            id: licenseType.id,
            state: licenseType.state,
            name: licenseType.name,
            description: licenseType.description || '',
            processing_time_display: licenseType.processing_time_display || '',
            cost_display: licenseType.cost_display || '',
            service_fee_display: licenseType.service_fee_display || '',
            renewal_period_display: licenseType.renewal_period_display || '',
          }}
          selectedState={licenseType.state}
        />
      </div>
    </AdminLayout>
  )
}
