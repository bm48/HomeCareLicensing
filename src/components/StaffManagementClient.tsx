'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Search,
  Plus,
  Mail,
  Phone,
  FileText,
  Clock as ClockIcon,
  Medal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddStaffMemberModal from './AddStaffMemberModal'
import StaffActionsDropdown from './StaffActionsDropdown'
import ViewStaffDetailsModal from './ViewStaffDetailsModal'
import EditStaffModal from './EditStaffModal'
import ManageLicensesModal from './ManageLicensesModal'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  role: string
  job_title?: string | null
  status: string
  employee_id?: string | null
  start_date?: string | null
  created_at?: string
  expiringLicensesCount?: number
}

interface StaffLicense {
  id: string
  staff_member_id: string
  license_type: string
  license_number: string
  state?: string | null
  status: string
  expiry_date?: string | null
  days_until_expiry?: number | null
}

interface StaffManagementClientProps {
  staffMembers: StaffMember[]
  licensesByStaff: Record<string, StaffLicense[]>
  totalStaff: number
  activeStaff: number
  expiringLicenses: number
  staffWithExpiringLicenses: (StaffMember & { expiringLicensesCount?: number })[]
}

export default function StaffManagementClient({
  staffMembers,
  licensesByStaff,
  totalStaff,
  activeStaff,
  expiringLicenses,
  staffWithExpiringLicenses,
}: StaffManagementClientProps) {
  const router = useRouter()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isManageLicensesOpen, setIsManageLicensesOpen] = useState(false)

  // Helper functions
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'inactive':
        return 'bg-gray-100 text-gray-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getLicenseStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'expiring':
        return 'bg-orange-100 text-orange-700'
      case 'expired':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleViewDetails = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setIsViewDetailsOpen(true)
  }

  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setIsEditModalOpen(true)
  }

  const handleManageLicenses = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setIsManageLicensesOpen(true)
  }

  const handleDeactivate = async (staff: StaffMember) => {
    if (!confirm(`Are you sure you want to deactivate ${staff.first_name} ${staff.last_name}?`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('staff_members')
        .update({ status: 'inactive' })
        .eq('id', staff.id)

      if (error) {
        alert('Failed to deactivate staff member: ' + error.message)
        return
      }

      router.refresh()
    } catch (err: any) {
      alert('Failed to deactivate staff member: ' + err.message)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Management</h1>
              <p className="text-gray-600 text-sm">
                Manage your team members and track their professional licenses
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Staff Member
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Total Staff Members</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{totalStaff}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="text-sm font-semibold text-gray-600">Active Staff</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{activeStaff}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-600">Licenses Expiring Soon</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{expiringLicenses}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search staff by name, email, or role..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
              <option>All Roles</option>
              <option>Registered Nurse</option>
              <option>Licensed Practical Nurse</option>
              <option>Certified Nursing Assistant</option>
            </select>
            <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-4">
          {staffWithExpiringLicenses.map((staff) => {
            const licenses = licensesByStaff[staff.id] || []
            const activeLicenses = licenses.filter(l => l.status === 'active')

            return (
              <div key={staff.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {getInitials(staff.first_name, staff.last_name)}
                    </div>

                    {/* Staff Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">
                          {staff.first_name} {staff.last_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(staff.status)}`}>
                          {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                        </span>
                        {staff.expiringLicensesCount && staff.expiringLicensesCount > 0 && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {staff.expiringLicensesCount} Licenses Expiring
                          </span>
                        )}
                      </div>

                      <div className="text-gray-600 mb-3">{staff.role}</div>

                      {/* Contact Info - Always displayed */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {staff.email || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {staff.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Medal className="w-4 h-4" />
                          {licenses.length === 0 ? '0 licenses' : `${licenses.length} License${licenses.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>

                      {/* Active Licenses & Certifications - Always displayed */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">Active Licenses & Certifications</h4>
                        {activeLicenses.length === 0 ? (
                          <p className="text-gray-500 text-sm">No active licenses or certifications.</p>
                        ) : (
                          <div className="space-y-3">
                            {activeLicenses.map((license) => {
                              const isExpiring = license.days_until_expiry && license.days_until_expiry <= 30 && license.days_until_expiry > 0
                              return (
                                <div key={license.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900">{license.license_type}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLicenseStatusBadge(isExpiring ? 'expiring' : license.status)}`}>
                                          {license.status === 'active' && isExpiring ? 'Expiring' : license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {license.license_number}
                                        {license.state && ` • ${license.state}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {license.expiry_date ? (
                                      <>
                                        <div className="text-xs text-gray-500 mb-1">Expires</div>
                                        <div className="text-sm font-semibold text-gray-900 mb-1">
                                          {formatDate(license.expiry_date)}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-xs text-gray-500 mb-1">Expires</div>
                                        <div className="text-sm font-semibold text-gray-900 mb-1">-</div>
                                      </>
                                    )}
                                    {license.days_until_expiry !== null && license.days_until_expiry !== undefined ? (
                                      <div className={`text-xs font-semibold ${
                                        license.days_until_expiry <= 30 ? 'text-orange-600' : 'text-gray-500'
                                      }`}>
                                        {license.days_until_expiry} days remaining
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">-</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <StaffActionsDropdown
                    staffId={staff.id}
                    onViewDetails={() => handleViewDetails(staff)}
                    onEdit={() => handleEdit(staff)}
                    onManageLicenses={() => handleManageLicenses(staff)}
                    onDeactivate={() => handleDeactivate(staff)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {staffMembers.length === 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No staff members yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first staff member</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Staff Member
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddStaffMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
        }}
      />

      {selectedStaff && (
        <>
          <ViewStaffDetailsModal
            isOpen={isViewDetailsOpen}
            onClose={() => {
              setIsViewDetailsOpen(false)
              setSelectedStaff(null)
            }}
            staff={selectedStaff}
            licenses={licensesByStaff[selectedStaff.id] || []}
          />

          <EditStaffModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedStaff(null)
            }}
            staff={selectedStaff}
            onSuccess={() => {
              setIsEditModalOpen(false)
              setSelectedStaff(null)
            }}
          />

          <ManageLicensesModal
            isOpen={isManageLicensesOpen}
            onClose={() => {
              setIsManageLicensesOpen(false)
              setSelectedStaff(null)
            }}
            staffId={selectedStaff.id}
            staffName={`${selectedStaff.first_name} ${selectedStaff.last_name}`}
            existingLicenses={licensesByStaff[selectedStaff.id] || []}
            onSuccess={() => {
              setIsManageLicensesOpen(false)
              setSelectedStaff(null)
            }}
          />
        </>
      )}
    </>
  )
}

