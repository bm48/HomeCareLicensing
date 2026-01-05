import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/AdminLayout'
import { 
  DollarSign, 
  Building2,
  Users,
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default async function BillingPage() {
  const { user, profile } = await requireAdmin()
  const supabase = await createClient()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Get billing data for current month
  const currentMonth = new Date()
  currentMonth.setDate(1)
  const currentMonthStr = currentMonth.toISOString().split('T')[0]

  const { data: billing } = await supabase
    .from('billing')
    .select('*')
    .eq('billing_month', currentMonthStr)
    .order('created_at', { ascending: false })

  // Get clients separately
  const clientIds = billing?.map(b => b.client_id).filter(Boolean) || []
  const { data: clients } = clientIds.length > 0 ? await supabase
    .from('clients')
    .select('id, company_name, contact_name, contact_email, contact_phone')
    .in('id', clientIds) : { data: [] }

  const clientsById: Record<string, any> = {}
  clients?.forEach(c => {
    clientsById[c.id] = c
  })

  // Calculate totals
  const totalRevenue = billing?.reduce((acc, b) => acc + parseFloat(b.total_amount.toString()), 0) || 0
  const activeClients = billing?.length || 0
  const totalUserLicenses = billing?.reduce((acc, b) => acc + (b.user_licenses_count || 0), 0) || 0
  const totalApplications = billing?.reduce((acc, b) => acc + (b.applications_count || 0), 0) || 0
  const applicationFees = billing?.reduce((acc, b) => acc + (b.applications_count * parseFloat(b.application_rate.toString())), 0) || 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <AdminLayout 
      user={user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Billing & Invoicing</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage client billing and revenue tracking</p>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm md:text-base whitespace-nowrap">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="text-lg md:text-xl font-semibold text-gray-900">
            {formatDate(currentMonthStr)}
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs md:text-sm text-gray-600">Total Revenue</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{activeClients}</div>
            <div className="text-xs md:text-sm text-gray-600">Active Clients</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{totalUserLicenses}</div>
            <div className="text-xs md:text-sm text-gray-600">$50/mo each</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{totalApplications}</div>
            <div className="text-xs md:text-sm text-gray-600">6 active, 4 completed</div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 md:p-6 shadow-md border border-green-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{formatCurrency(applicationFees)}</div>
            <div className="text-xs md:text-sm text-gray-600">$500 per application</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search by client name, business name, or client ID..."
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Client Billing List */}
        <div className="space-y-4">
          {billing && billing.length > 0 ? (
            billing.map((bill) => {
              const client = clientsById[bill.client_id]
              const userLicenseTotal = (bill.user_licenses_count || 0) * parseFloat(bill.user_license_rate.toString())
              const applicationTotal = (bill.applications_count || 0) * parseFloat(bill.application_rate.toString())

              return (
                <div key={bill.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{client?.company_name}</h3>
                        <span className="px-2 md:px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full whitespace-nowrap">
                          CL-{bill.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs md:text-sm text-gray-600">
                        <div>Contact: {client?.contact_name}</div>
                        <div className="break-all">Email: {client?.contact_email}</div>
                        {client?.contact_phone && <div>Phone: {client.contact_phone}</div>}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="mb-2">
                        <div className="text-xs md:text-sm text-gray-600">User Licenses: {bill.user_licenses_count} ({formatCurrency(userLicenseTotal)}/mo)</div>
                        <div className="text-xs md:text-sm text-gray-600">Applications: {bill.applications_count} ({formatCurrency(applicationTotal)})</div>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-green-600">
                        {formatCurrency(parseFloat(bill.total_amount.toString()))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-xl p-8 md:p-12 text-center shadow-md border border-gray-100">
              <DollarSign className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No billing data for this month</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

