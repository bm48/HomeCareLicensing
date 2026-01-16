'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, MapPin, FileText, DollarSign, Clock, Calendar, Plus, Eye, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddLicenseTypeModal from './AddLicenseTypeModal'

interface LicenseType {
  id: string
  state: string
  name: string
  description: string
  cost_display: string
  service_fee_display?: string
  processing_time_display: string
  processing_time_min?: number
  processing_time_max?: number
  renewal_period_display: string
  is_active: boolean
}

interface LicenseTypesTableProps {
  licenseTypes: LicenseType[]
}

export default function LicenseTypesTable({ licenseTypes }: LicenseTypesTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('All States')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loadingLicenseId, setLoadingLicenseId] = useState<string | null>(null)

  // Get unique states
  const allStates = useMemo(() => {
    const statesSet = new Set<string>()
    licenseTypes.forEach(lt => {
      if (lt.state) {
        statesSet.add(lt.state)
      }
    })
    return Array.from(statesSet).sort()
  }, [licenseTypes])

  // Filter license types
  const filteredLicenseTypes = useMemo(() => {
    return licenseTypes.filter(lt => {
      // Search filter (name, state, description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          lt.name.toLowerCase().includes(query) ||
          lt.state.toLowerCase().includes(query) ||
          (lt.description && lt.description.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }

      // State filter
      if (selectedState !== 'All States') {
        if (lt.state !== selectedState) return false
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        if (selectedStatus === 'Active' && !lt.is_active) return false
        if (selectedStatus === 'Inactive' && lt.is_active) return false
      }

      return true
    })
  }, [licenseTypes, searchQuery, selectedState, selectedStatus])

  const handleViewDetail = (e: React.MouseEvent, licenseTypeId: string) => {
    e.stopPropagation()
    setLoadingLicenseId(licenseTypeId)
    router.push(`/admin/license-requirements/${licenseTypeId}`)
  }

  const getAverageProcessingTime = (licenseType: LicenseType) => {
    if (licenseType.processing_time_min && licenseType.processing_time_max) {
      const avg = Math.round((licenseType.processing_time_min + licenseType.processing_time_max) / 2)
      return `${avg} days`
    }
    return licenseType.processing_time_display || 'N/A'
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Search and Filters with Add Button */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, state, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
            />
          </div>
          {/* Filter Icon Button */}
          <button className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          {/* State Dropdown */}
          <select 
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white cursor-pointer"
          >
            <option>All States</option>
            {allStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {/* Status Dropdown */}
          {/* <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white cursor-pointer"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select> */}
          {/* Add Type Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Type
          </button>
        </div>
      </div>

      {/* License Types Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">License ID</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name & Description</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">State</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Average Processing Time</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Application Fee</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service Fee</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Renewal Period</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLicenseTypes && filteredLicenseTypes.length > 0 ? (
                filteredLicenseTypes.map((licenseType) => {
                  // Generate a readable ID (first 8 chars of UUID)
                  const licenseId = `LIC-${licenseType.id.substring(0, 8).toUpperCase()}`

                  return (
                    <tr 
                      key={licenseType.id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-blue-600">
                        {licenseId}
                      </td>
                      <td className="px-3 md:px-6 py-4">
                        <div>
                          <div className="text-xs md:text-sm font-medium text-gray-900">{licenseType.name}</div>
                          <div className="text-xs md:text-sm text-gray-500 line-clamp-1">{licenseType.description || 'No description'}</div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                          <span className="text-xs md:text-sm text-gray-900">{licenseType.state}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{getAverageProcessingTime(licenseType)}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className="text-xs md:text-sm text-gray-900">{licenseType.cost_display || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className="text-xs md:text-sm text-gray-900">{licenseType.service_fee_display || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{licenseType.renewal_period_display || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => handleViewDetail(e, licenseType.id)}
                          disabled={loadingLicenseId === licenseType.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingLicenseId === licenseType.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              View Detail
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No license types found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add License Type Modal */}
      <AddLicenseTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          window.location.reload() // Refresh to show new license type
        }}
      />
    </div>
  )
}
