'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  MessageSquare, 
  FileText, 
  DollarSign,
  UserCog,
  LogOut, 
  Bell, 
  ChevronLeft,
  Home,
  Menu,
  X
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import LoadingSpinner from './LoadingSpinner'
import UserDropdown from './UserDropdown'

interface AdminLayoutProps {
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

export default function AdminLayout({ 
  children, 
  user, 
  profile,
  unreadNotifications = 0 
}: AdminLayoutProps) {
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
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/clients', label: 'Client Management', icon: Building2 },
    { href: '/admin/experts', label: 'Licensing Experts', icon: Users },
    { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { href: '/admin/license-requirements', label: 'License Requirements', icon: FileText },
    { href: '/admin/billing', label: 'Billing & Invoicing', icon: DollarSign },
    { href: '/admin/users', label: 'User Management', icon: UserCog },
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
    return 'A'
  }

  const getDisplayName = () => {
    return profile?.full_name || user.email || 'Admin User'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && <LoadingSpinner />}
      {/* Top Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="inline-flex items-center justify-center">
              <Home className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            </div>
            <span className="text-base md:text-xl font-bold">HOME + SIGHTS CONSULTING</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
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
              profileUrl="/admin/profile"
              changePasswordUrl="/change-password"
            />
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          bg-gray-100 shadow-lg transition-all duration-300
          fixed lg:static inset-y-0 left-0 z-50
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          min-h-[calc(100vh-73px)] lg:min-h-[calc(100vh-73px)]
        `}>
          <div className="p-4 h-full overflow-y-auto">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-full items-center justify-center p-2 hover:bg-gray-200 rounded-lg transition-colors mb-4"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {!sidebarCollapsed && (
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">
                Admin Menu
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
                        ? 'bg-gray-200 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-8 pt-4 border-t border-gray-300">
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
        <main className="flex-1 p-4 md:p-6 w-full lg:w-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

