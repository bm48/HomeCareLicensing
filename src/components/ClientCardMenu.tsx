'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, MessageSquare, UserCog, FileText, Edit } from 'lucide-react'

interface ClientCardMenuProps {
  clientId: string
}

export default function ClientCardMenu({
  clientId,
}: ClientCardMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  const handleViewDetails = () => {
    setIsOpen(false)
    try {
      router.push(`/admin/clients/${clientId}`)
    } catch (error) {
      console.error('Navigation error:', error)
      window.location.href = `/admin/clients/${clientId}`
    }
  }

  const handleOpenMessages = () => {
    setIsOpen(false)
    try {
      router.push(`/admin/messages?client=${clientId}`)
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to window.location if router fails
      window.location.href = `/admin/messages?client=${clientId}`
    }
  }

  const handleChangeExpert = () => {
    // TODO: Implement change expert functionality
    console.log('Change expert for client:', clientId)
    setIsOpen(false)
  }

  const handleViewApplications = () => {
    // TODO: Navigate to applications or filter by client
    // router.push(`/admin?client=${clientId}`)
    console.log('View applications for client:', clientId)
    setIsOpen(false)
  }

  const handleEditClient = () => {
    // TODO: Implement edit client functionality
    console.log('Edit client:', clientId)
    setIsOpen(false)
  }

  const menuItems = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: handleViewDetails,
    },
    {
      label: 'Open Messages',
      icon: MessageSquare,
      onClick: handleOpenMessages,
    },
    {
      label: 'Change Expert',
      icon: UserCog,
      onClick: handleChangeExpert,
    },
    {
      label: 'View Applications',
      icon: FileText,
      onClick: handleViewApplications,
    },
    {
      label: 'Edit Client Info',
      icon: Edit,
      onClick: handleEditClient,
    },
  ]

  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="More options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick()
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-600" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
