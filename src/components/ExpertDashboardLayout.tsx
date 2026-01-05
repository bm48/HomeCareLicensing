'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  MessageSquare, 
  LogOut, 
  Bell, 
  ChevronLeft,
  Menu,
  X,
  Home
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import LoadingSpinner from './LoadingSpinner'

interface ExpertDashboardLayoutProps {
  children: React.ReactNode
  user: {
    email?: string | null
  } | null
  profile: {
    full_name?: string | null
    role?: string | null
  } | null
  unreadNotifications?: number
}

export default function ExpertDashboardLayout({ 
  children, 
  user, 
  profile,
  unreadNotifications = 0 
}: ExpertDashboardLayoutProps) {
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
    { href: '/dashboard/expert/clients', label: 'My Clients', icon: Users },
    { href: '/dashboard/expert/messages', label: 'Messages', icon: MessageSquare },
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
    return profile?.full_name || user?.email || 'User'
  }

  const getRoleDisplay = () => {
    if (!profile?.role) return 'User'
    return profile.role === 'expert' ? 'Licensing Expert' : 'Expert'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && <LoadingSpinner />}
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg">
              <Home className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <span className="text-base sm:text-xl font-bold truncate">HOME + SIGHTS CONSULTING</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <div className="relative">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer hover:text-blue-200 transition-colors" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base">
                {getInitials(profile?.full_name, user?.email)}
              </div>
              <div className="hidden md:block">
                <div className="font-semibold text-sm sm:text-base">{getDisplayName()}</div>
                <div className="text-xs sm:text-sm text-blue-100">{getRoleDisplay()}</div>
              </div>
              <ChevronLeft className="w-4 h-4 hidden md:block rotate-[-90deg] cursor-pointer hover:text-blue-200" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          bg-white shadow-lg transition-all duration-300 
          fixed lg:static inset-y-0 left-0 z-50
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          min-h-[calc(100vh-73px)] lg:min-h-[calc(100vh-73px)]
        `}>
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

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 w-full lg:w-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

