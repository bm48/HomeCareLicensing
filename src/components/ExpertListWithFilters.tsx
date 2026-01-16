'use client'

import { useState, useMemo } from 'react'
import { 
  Search,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  MoreVertical
} from 'lucide-react'

interface Expert {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: string
  role: string
  expertise?: string
}

interface ExpertListWithFiltersProps {
  experts: Expert[]
  statesByExpert: Record<string, string[]>
  clientsByExpert: Record<string, number>
}

export default function ExpertListWithFilters({
  experts,
  statesByExpert,
  clientsByExpert
}: ExpertListWithFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('All States')
  const [selectedStatus, setSelectedStatus] = useState('All Status')

  // Get unique states from all experts
  const allStates = useMemo(() => {
    const statesSet = new Set<string>()
    Object.values(statesByExpert).forEach(states => {
      states.forEach(state => statesSet.add(state))
    })
    return Array.from(statesSet).sort()
  }, [statesByExpert])

  // Filter experts based on search and filters
  const filteredExperts = useMemo(() => {
    return experts.filter(expert => {
      // Search filter (name, email, expertise)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const fullName = `${expert.first_name} ${expert.last_name}`.toLowerCase()
        const matchesSearch = 
          fullName.includes(query) ||
          expert.email.toLowerCase().includes(query) ||
          (expert.expertise && expert.expertise.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }

      // State filter
      if (selectedState !== 'All States') {
        const expertStates = statesByExpert[expert.id] || []
        if (!expertStates.includes(selectedState)) return false
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        const expertStatus = expert.status.charAt(0).toUpperCase() + expert.status.slice(1)
        if (expertStatus !== selectedStatus) return false
      }

      return true
    })
  }, [experts, searchQuery, selectedState, selectedStatus, statesByExpert])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search experts by name, email, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <select 
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All States">All States</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 min-w-[120px] px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expert List */}
      <div className="space-y-4">
        {filteredExperts && filteredExperts.length > 0 ? (
          filteredExperts.map((expert) => {
            const expertStatesList = statesByExpert[expert.id] || []
            const clientCount = clientsByExpert[expert.id] || 0

            return (
              <div key={expert.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-lg flex-shrink-0">
                      {getInitials(expert.first_name, expert.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{expert.first_name} {expert.last_name}</h3>
                        <span className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          expert.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expert.status}
                        </span>
                      </div>
                      <div className="text-sm md:text-base text-gray-600 mb-3">{expert.role}</div>
                      <div className="space-y-1 text-xs md:text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="break-all">{expert.email}</span>
                        </div>
                        {expert.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>{expert.phone}</span>
                          </div>
                        )}
                        {expertStatesList.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="text-gray-700 font-medium">Specialization:</span>
                            {expertStatesList.map(state => (
                              <span key={state} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {state}
                              </span>
                            ))}
                          </div>
                        )}
                        {expert.expertise && (
                          <div className="mt-2">
                            <span className="text-gray-700 font-medium">Expertise: </span>
                            <span className="text-gray-600 break-words">{expert.expertise}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Briefcase className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span>{clientCount} Clients</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-xl p-8 md:p-12 text-center shadow-md border border-gray-100">
            <Briefcase className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base md:text-lg">No experts found</p>
            {(searchQuery || selectedState !== 'All States' || selectedStatus !== 'All Status') && (
              <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
