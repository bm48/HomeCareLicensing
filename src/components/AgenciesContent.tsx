'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import AddAgencyModal, { type AgencyAdminOption } from './AddAgencyModal'

interface Agency {
  id: string
  name: string
  agency_admin_id: string | null
  created_at: string
  updated_at: string
}

interface AgenciesContentProps {
  agencies: Agency[]
  agencyAdmins: AgencyAdminOption[]
  agencyAdminsForSelect: AgencyAdminOption[]
}

export default function AgenciesContent({
  agencies,
  agencyAdmins,
  agencyAdminsForSelect,
}: AgenciesContentProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editAgency, setEditAgency] = useState<{
    id: string
    name: string
    agency_admin_id: string | null
  } | null>(null)

  const openAdd = () => {
    setEditAgency(null)
    setModalOpen(true)
  }

  const openEdit = (agency: Agency) => {
    setEditAgency({
      id: agency.id,
      name: agency.name,
      agency_admin_id: agency.agency_admin_id,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditAgency(null)
  }

  const getAdminDisplay = (agencyAdminId: string | null) => {
    if (!agencyAdminId) return '—'
    const admin = agencyAdmins.find((a) => a.id === agencyAdminId)
    if (!admin) return '—'
    return `${admin.contact_name} (${admin.contact_email})`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return '—'
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">All Agencies</h2>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Agency
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Agency Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Agency Admin
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No agencies yet. Click &quot;Add New Agency&quot; to create one.
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {agency.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {getAdminDisplay(agency.agency_admin_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(agency.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(agency)}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit agency"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddAgencyModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSuccess={closeModal}
        agencyAdmins={agencyAdmins}
        agencyAdminsForSelect={agencyAdminsForSelect}
        editAgency={editAgency}
      />
    </>
  )
}
