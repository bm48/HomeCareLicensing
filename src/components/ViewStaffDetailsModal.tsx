'use client'

import Modal from './Modal'
import { Mail, Phone, FileText, Calendar, User, Briefcase } from 'lucide-react'

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
}

interface StaffLicense {
  id: string
  license_type: string
  license_number: string
  state?: string | null
  status: string
  expiry_date?: string | null
  days_until_expiry?: number | null
}

interface ViewStaffDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffMember
  licenses: StaffLicense[]
}

export default function ViewStaffDetailsModal({
  isOpen,
  onClose,
  staff,
  licenses,
}: ViewStaffDetailsModalProps) {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Staff Member Details" size="lg">
      <div className="space-y-6">
        {/* Staff Header */}
        <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {getInitials(staff.first_name, staff.last_name)}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {staff.first_name} {staff.last_name}
            </h3>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(staff.status)}`}>
                {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
              </span>
              {staff.role && (
                <span className="text-gray-600">{staff.role}</span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{staff.email}</span>
            </div>
            {staff.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{staff.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Employment Details */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h4>
          <div className="grid grid-cols-2 gap-4">
            {staff.job_title && (
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Job Title</div>
                  <div className="text-gray-700 font-medium">{staff.job_title}</div>
                </div>
              </div>
            )}
            {staff.employee_id && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Employee ID</div>
                  <div className="text-gray-700 font-medium">{staff.employee_id}</div>
                </div>
              </div>
            )}
            {staff.start_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Start Date</div>
                  <div className="text-gray-700 font-medium">{formatDate(staff.start_date)}</div>
                </div>
              </div>
            )}
            {staff.created_at && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Added Date</div>
                  <div className="text-gray-700 font-medium">{formatDate(staff.created_at)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Licenses */}
        {licenses.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Licenses & Certifications</h4>
            <div className="space-y-3">
              {licenses.map((license) => (
                <div key={license.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{license.license_type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      license.status === 'active' ? 'bg-green-100 text-green-700' :
                      license.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {license.license_number}
                    {license.state && ` • ${license.state}`}
                  </div>
                  {license.expiry_date && (
                    <div className="text-sm text-gray-600">
                      Expires: {formatDate(license.expiry_date)}
                      {license.days_until_expiry !== null && license.days_until_expiry !== undefined && (
                        <span className={`ml-2 font-semibold ${
                          license.days_until_expiry <= 30 ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          ({license.days_until_expiry} days remaining)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

