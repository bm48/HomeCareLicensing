'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Edit, FileText } from 'lucide-react'

interface StaffActionsDropdownProps {
  staffId: string
  onViewDetails: () => void
  onEdit: () => void
  onManageLicenses: () => void
}

export default function StaffActionsDropdown({
  staffId,
  onViewDetails,
  onEdit,
  onManageLicenses,
}: StaffActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
        aria-label="More options"
      >
        <MoreVertical className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-2">
          <button
            onClick={() => handleAction(onViewDetails)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">View details</span>
          </button>
          <button
            onClick={() => handleAction(onEdit)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Edit className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Edit information</span>
          </button>
          <button
            onClick={() => handleAction(onManageLicenses)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Manage Licenses</span>
          </button>
        </div>
      )}
    </div>
  )
}

