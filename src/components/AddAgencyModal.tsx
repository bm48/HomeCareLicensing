'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createAgency, updateAgency } from '@/app/actions/agencies'

export interface AgencyAdminOption {
  id: string
  contact_name: string
  contact_email: string
}

interface AddAgencyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  /** All agency admins (for showing current selection in edit mode) */
  agencyAdmins: AgencyAdminOption[]
  /** Agency admins with company_name null only (for dropdown options) */
  agencyAdminsForSelect: AgencyAdminOption[]
  /** When set, modal is in edit mode */
  editAgency?: { id: string; name: string; agency_admin_id: string | null } | null
}

export default function AddAgencyModal({
  isOpen,
  onClose,
  onSuccess,
  agencyAdmins,
  agencyAdminsForSelect,
  editAgency,
}: AddAgencyModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [agencyAdminId, setAgencyAdminId] = useState<string>('')

  const isEdit = !!editAgency

  const selectOptions = useMemo(() => {
    return isEdit ? agencyAdmins : agencyAdminsForSelect
  }, [isEdit, agencyAdmins, agencyAdminsForSelect])

  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (editAgency) {
        setName(editAgency.name)
        setAgencyAdminId(editAgency.agency_admin_id || '')
      } else {
        setName('')
        setAgencyAdminId('')
      }
    }
  }, [isOpen, editAgency])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (isEdit && editAgency) {
        const result = await updateAgency(
          editAgency.id,
          name.trim(),
          agencyAdminId || null,
          editAgency.agency_admin_id || null
        )
        if (result.error) {
          setError(result.error)
          setIsLoading(false)
          return
        }
      } else {
        const result = await createAgency(name.trim(), agencyAdminId || null)
        if (result.error) {
          setError(result.error)
          setIsLoading(false)
          return
        }
      }
      onSuccess?.()
      router.refresh()
      onClose()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Agency' : 'Add New Agency'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="agency_name" className="block text-sm font-semibold text-gray-700 mb-2">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="agency_name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="Acme Home Care LLC"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="agency_admin" className="block text-sm font-semibold text-gray-700 mb-2">
              Agency Admin
            </label>
            <select
              id="agency_admin"
              value={agencyAdminId}
              onChange={(e) => setAgencyAdminId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {selectOptions.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.contact_name} ({admin.contact_email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isEdit ? 'Update Agency' : 'Add Agency'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
