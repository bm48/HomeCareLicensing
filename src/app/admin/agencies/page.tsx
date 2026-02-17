import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import AgenciesContent from '@/components/AgenciesContent'
import { Building2 } from 'lucide-react'

export default async function AgenciesPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const { data: agencies } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: agencyAdmins } = await supabase
    .from('clients')
    .select('id, contact_name, contact_email')
    .not('company_owner_id', 'is', null)
    .order('contact_name')

  const { data: agencyAdminsForSelect } = await supabase
    .from('clients')
    .select('id, contact_name, contact_email')
    .not('company_owner_id', 'is', null)
    .is('company_name', null)
    .order('contact_name')

  return (
    <AdminLayout
      user={user}
      profile={profile}
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            <span className="break-words">Agencies</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage agencies (companies) and tie them to agency admins.
          </p>
        </div>

        <AgenciesContent
          agencies={agencies || []}
          agencyAdmins={(agencyAdmins || []).map((a) => ({
            id: a.id,
            contact_name: a.contact_name ?? '',
            contact_email: a.contact_email ?? '',
          }))}
          agencyAdminsForSelect={(agencyAdminsForSelect || []).map((a) => ({
            id: a.id,
            contact_name: a.contact_name ?? '',
            contact_email: a.contact_email ?? '',
          }))}
        />
      </div>
    </AdminLayout>
  )
}
