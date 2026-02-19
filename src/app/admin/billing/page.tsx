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

  // Get all agencies
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, agency_admin_ids')
    .order('name', { ascending: true })

  if (!agencies) {
    return (
      <AdminLayout 
        user={user} 
        profile={profile} 
        unreadNotifications={unreadNotifications || 0}
      >
        <div>Error loading agencies</div>
      </AdminLayout>
    )
  }

  // Get all staff members grouped by agency
  const { data: staffMembers } = await supabase
    .from('staff_members')
    .select('*')
    .not('agency_id', 'is', null)
    .eq('status', 'active')

  type StaffMember = { id: string; agency_id: string | null; [key: string]: any }
  const staffByAgency: Record<string, StaffMember[]> = {}
  if (staffMembers) {
    staffMembers.forEach(staff => {
      if (staff?.agency_id) {
        if (!staffByAgency[staff.agency_id]) staffByAgency[staff.agency_id] = []
        staffByAgency[staff.agency_id].push(staff)
      }
    })
  }

  // Get ALL cases (not filtered by month - will be filtered client-side)
  const { data: allCases } = await supabase
    .from('cases')
    .select('*')
    .order('started_date', { ascending: false })

  type Case = {
    id: string
    case_id: string
    client_id: string
    business_name: string
    state: string
    status: string
    progress_percentage: number
    started_date: string
    last_activity: string
    documents_count: number
    steps_count: number
  }
  const allCasesByClient: Record<string, Case[]> = {}
  if (allCases) {
    allCases.forEach(c => {
      if (c?.client_id) {
        if (!allCasesByClient[c.client_id]) allCasesByClient[c.client_id] = []
        allCasesByClient[c.client_id].push(c as Case)
      }
    })
  }

  // Get all license types for fee calculation
  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('*')
    .eq('is_active', true)

  // Get pricing that was effective for the selected month
  const { getPricingForMonth } = await import('@/app/actions/pricing')
  const pricingResult = await getPricingForMonth(selectedYear, selectedMonth)
  const pricingData = pricingResult.data
  const ownerLicenseRate = pricingData?.owner_admin_license || 0
  const staffLicenseRate = pricingData?.staff_license || 0

  // Build billing data per agency: owner count = agency admins (clients) in agency, staff = staff in agency, cases = all cases for those clients
  const baseBillingData = agencies.map(agency => {
    const adminIds = (agency.agency_admin_ids as string[] | null) || []
    const staff = staffByAgency[agency.id] || []
    const allAgencyCases: Case[] = []
    adminIds.forEach(cid => {
      (allCasesByClient[cid] || []).forEach(c => allAgencyCases.push(c))
    })

    const ownerCount = adminIds.length
    const staffCount = staff.length
    const totalLicenses = ownerCount + staffCount
    const ownerLicenseFee = ownerCount * ownerLicenseRate
    const staffLicenseFee = staffCount * staffLicenseRate
    const totalLicenseFee = ownerLicenseFee + staffLicenseFee

    return {
      agency: { id: agency.id, name: agency.name ?? '' },
      ownerCount,
      staffCount,
      totalLicenses,
      ownerLicenseFee,
      staffLicenseFee,
      totalLicenseFee,
      allCases: allAgencyCases
    }
  })

  const activeAgencies = agencies.length

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
        activeAgencies={activeAgencies}
        ownerLicenseRate={ownerLicenseRate}
        staffLicenseRate={staffLicenseRate}
        licenseTypes={licenseTypes || []}
      />
    </AdminLayout>
  )
}
