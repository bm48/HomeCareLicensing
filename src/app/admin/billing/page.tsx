import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import BillingContent from '@/components/BillingContent'

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()
  const params = await searchParams

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get current date or use search params
  const now = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1
  const selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1)

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('company_name', { ascending: true })

  if (!clients) {
    return (
      <AdminLayout 
        user={user} 
        profile={profile} 
        unreadNotifications={unreadNotifications || 0}
      >
        <div>Error loading clients</div>
      </AdminLayout>
    )
  }

  // Get all staff members grouped by client
  const clientIds = clients.map(c => c.id)
  const { data: staffMembers } = clientIds.length > 0 ? await supabase
    .from('staff_members')
    .select('*')
    .in('company_owner_id', clientIds)
    .eq('status', 'active') : { data: [] }

  // Group staff by client
  type StaffMember = { id: string; company_owner_id: string | null; [key: string]: any }
  const staffByClient: Record<string, StaffMember[]> = {}
  if (staffMembers) {
    staffMembers.forEach(staff => {
      if (staff && staff.company_owner_id) {
        if (!staffByClient[staff.company_owner_id]) {
          staffByClient[staff.company_owner_id] = []
        }
        staffByClient[staff.company_owner_id].push(staff)
      }
    })
  }

  // Get ALL cases (not filtered by month - will be filtered client-side)
  const { data: allCases } = await supabase
    .from('cases')
    .select('*')
    .order('started_date', { ascending: false })

  // Group ALL cases by client (will be filtered by month on client side)
  type Case = { id: string; client_id: string; started_date: string; [key: string]: any }
  const allCasesByClient: Record<string, Case[]> = {}
  if (allCases) {
    allCases.forEach(c => {
      if (c && c.client_id) {
        if (!allCasesByClient[c.client_id]) {
          allCasesByClient[c.client_id] = []
        }
        allCasesByClient[c.client_id].push(c)
      }
    })
  }

  // Get all license types for fee calculation
  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('*')
    .eq('is_active', true)

  // Create a map of license type name + state to cost
  const licenseTypeFeeMap: Record<string, number> = {}
  licenseTypes?.forEach(lt => {
    const key = `${lt.state}_${lt.name}`
    // Parse cost from cost_display (e.g., "$500" -> 500)
    const costMatch = lt.cost_display?.replace(/[^0-9.]/g, '')
    const cost = costMatch ? parseFloat(costMatch) : (lt.cost_min || 0)
    licenseTypeFeeMap[key] = cost
  })

  // Get pricing table for license rates
  const { data: pricingData } = await supabase
    .from('pricing')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ownerLicenseRate = pricingData?.owner_admin_license || 0
  const staffLicenseRate = pricingData?.staff_license || 0

  // Prepare base billing data (without month filtering - will be done client-side)
  // License fees are constant per client, only application fees change by month
  const baseBillingData = clients.map(client => {
    const staff = staffByClient[client.id] || []
    const allClientCases = allCasesByClient[client.id] || []
    
    // Count owners (1 per client) and staff
    const ownerCount = 1
    const staffCount = staff.length
    const totalLicenses = ownerCount + staffCount
    
    // Calculate license fees (constant, doesn't depend on month)
    const ownerLicenseFee = ownerCount * ownerLicenseRate
    const staffLicenseFee = staffCount * staffLicenseRate
    const totalLicenseFee = ownerLicenseFee + staffLicenseFee

    return {
      client,
      ownerCount,
      staffCount,
      totalLicenses,
      ownerLicenseFee,
      staffLicenseFee,
      totalLicenseFee,
      allCases: allClientCases // Pass all cases, will be filtered client-side
    }
  })

  // Calculate active clients (constant)
  const activeClients = clients.filter(c => c.status === 'active').length

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <BillingContent
        baseBillingData={baseBillingData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        activeClients={activeClients}
        ownerLicenseRate={ownerLicenseRate}
        staffLicenseRate={staffLicenseRate}
        licenseTypes={licenseTypes || []}
      />
    </AdminLayout>
  )
}
