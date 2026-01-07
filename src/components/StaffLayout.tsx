'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  User, 
  LogOut, 
  Bell, 
  ChevronLeft
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import LoadingSpinner from './LoadingSpinner'
import UserDropdown from './UserDropdown'

interface StaffLayoutProps {
  children: React.ReactNode
  user: {
    email?: string | null
  }
  profile: {
    full_name?: string | null
    role?: string | null
  } | null
  unreadNotifications?: number
}

export default function StaffLayout({ 
  children, 
  user, 
  profile,
  unreadNotifications = 0 
}: StaffLayoutProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPath, setCurrentPath] = useState(pathname)

  // Track pathname changes to show/hide loading
  useEffect(() => {
    if (pathname !== currentPath) {
      setCurrentPath(pathname)
      setIsLoading(false)
    }
  }, [pathname, currentPath])

  // Handle link clicks to show loading
  const handleLinkClick = (href: string) => {
    if (href !== pathname) {
      setIsLoading(true)
    }
  }

  const menuItems = [
    { href: '/staff-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/staff-dashboard/my-licenses', label: 'My Licenses', icon: FileText },
  ]

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  const getDisplayName = () => {
    return profile?.full_name || user.email || 'User'
  }

  const getRoleDisplay = () => {
    if (!profile?.role) return 'Staff Member'
    return profile.role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && <LoadingSpinner />}
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-12 md:w-28 md:h-16">
              <Image
                src="/cropped-HomeSights-NEWLOGO-1.png"
                alt="Home Sights Consulting Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {/* Notifications */}
            <div className="relative">
              <Bell className="w-5 h-5 md:w-6 md:h-6 cursor-pointer hover:text-blue-200 transition-colors" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </div>

            {/* User Dropdown */}
            <UserDropdown 
              user={user} 
              profile={profile} 
              profileUrl="/staff-dashboard/profile"
              changePasswordUrl="/change-password"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className={`hidden md:block bg-white shadow-lg transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } min-h-[calc(100vh-73px)]`}>
          <div className="p-4 h-full flex flex-col">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors mb-4"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {!sidebarCollapsed && (
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">
                Main Menu
              </div>
            )}

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleLinkClick(item.href)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-gray-200">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-all"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Logout</span>}
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          handleLinkClick(item.href)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>

                <div className="mt-8 pt-4 border-t border-gray-200">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-all"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </form>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
          {children}
        </main>
      </div>
    </div>
  )
}

