import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { Award, AlertTriangle, Users, FileText } from 'lucide-react'

export default async function ReportsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = await createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  const reports = [
    {
      id: 'staff-certifications',
      title: 'Staff Certifications Report',
      description: 'Comprehensive list of all staff members and their professional certifications',
      icon: Award,
      iconColor: 'bg-purple-100',
      iconTextColor: 'text-purple-600',
      href: '/dashboard/reports/staff-certifications'
    },
    {
      id: 'expiring-certifications',
      title: 'Expiring Certifications Report',
      description: 'Staff certifications expiring within the next 90 days',
      icon: AlertTriangle,
      iconColor: 'bg-yellow-100',
      iconTextColor: 'text-yellow-600',
      href: '/dashboard/reports/expiring-certifications'
    },
    {
      id: 'staff-roster',
      title: 'Staff Roster Report',
      description: 'Complete staff directory with contact information',
      icon: Users,
      iconColor: 'bg-blue-100',
      iconTextColor: 'text-blue-600',
      href: '/dashboard/reports/staff-roster'
    }
  ]

  return (
    <DashboardLayout 
      user={session.user} 
      profile={profile} 
      unreadNotifications={unreadNotifications || 0}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600 text-base md:text-lg">
            Generate and download reports based on your organization data
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <Link
                key={report.id}
                href={report.href}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${report.iconColor} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${report.iconTextColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {report.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 flex-1">
                    {report.description}
                  </p>

                  {/* Generate Report Button */}
                  <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
