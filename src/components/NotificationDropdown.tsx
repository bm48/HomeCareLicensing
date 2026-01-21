'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, MessageSquare, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ApplicationNotification {
  application_id: string
  application_name: string
  state: string
  unread_count: number
  last_message_at: string
}

interface NotificationDropdownProps {
  userId: string
  initialUnreadCount?: number
}

export default function NotificationDropdown({ 
  userId,
  initialUnreadCount = 0 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [applications, setApplications] = useState<ApplicationNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  
  // Cache and debounce refetch
  const lastFetchRef = useRef<number>(0)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const CACHE_TTL = 30000 // 30 seconds cache
  const DEBOUNCE_MS = 500 // 500ms debounce for faster badge updates

  // Get user role on mount
  useEffect(() => {
    console.log('userId', userId)
    if (!userId) return
    getUserRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Fetch initial badge count when userRole is available
  useEffect(() => {
    if (userRole && userId) {
      refreshBadgeCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userId])

  // Fetch applications when dropdown opens (with cache)
  useEffect(() => {
    if (isOpen && userId && userRole) {
      const now = Date.now()
      // Use cache if recent
      if (now - lastFetchRef.current < CACHE_TTL && applications.length > 0) {
        return
      }
      fetchApplicationsWithUnread()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId, userRole])

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

  const getUserRole = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile) {
        setUserRole(profile.role)
        return profile.role
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
    }
    return null
  }


  // Optimized: Single query with aggregation using query builder
  const fetchApplicationsWithUnread = useCallback(async () => {
    console.log('fetchApplicationsWithUnread')
    if (!userRole) return
    
    setIsLoading(true)
    try {
      // Step 1: Get application IDs based on role (single query)
      let applicationIds: string[] = []
      
      if (userRole === 'admin') {
        // For admins, we'll get conversations first and derive application IDs
        // This is more efficient than fetching all applications
        const { data: conversations } = await supabase
          .from('conversations')
          .select('application_id')
          .not('application_id', 'is', null)
          .limit(100) // Reasonable limit
        console.log('conversations', conversations)
        const uniqueAppIds = new Set(conversations?.map(c => c.application_id).filter(Boolean) || [])
        applicationIds = Array.from(uniqueAppIds) as string[]
      } else if (userRole === 'company_owner') {
        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('company_owner_id', userId)
        console.log('apps', apps)
        applicationIds = apps?.map(a => a.id) || []
      } else if (userRole === 'expert') {
        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('assigned_expert_id', userId)
        console.log('apps', apps)
        applicationIds = apps?.map(a => a.id) || []
      } else {
        // Staff members don't have access to conversations
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        return
      }

      if (applicationIds.length === 0) {
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        lastFetchRef.current = Date.now()
        return
      }

      // Step 2: Get conversations with application details (single query with JOIN)
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          application_id,
          last_message_at,
          applications!inner(id, application_name, state)
        `)
        .in('application_id', applicationIds)
      console.log('conversations', conversations)
      if (convError) {
        console.error('Error fetching conversations:', convError)
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        lastFetchRef.current = Date.now()
        return
      }

      if (!conversations || conversations.length === 0) {
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        lastFetchRef.current = Date.now()
        return
      }

      // Step 3: Get unread counts using RPC function (user ID not in is_read array)
      const conversationIds = conversations.map(c => c.id)
      
      // Validate inputs before calling RPC
      if (!userId || !Array.isArray(conversationIds) || conversationIds.length === 0) {
        console.warn('Invalid inputs for RPC call in fetchApplicationsWithUnread:', { userId, conversationIds: conversationIds.length })
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        return
      }
      
      const { data: unreadCounts, error: countError } = await supabase
        .rpc('count_unread_messages_for_user', {
          conversation_ids: conversationIds,
          user_id: userId
        })

      if (countError) {
        console.error('Error counting unread messages in fetchApplicationsWithUnread:', {
          error: countError,
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
          code: countError.code,
          conversationIds: conversationIds.length,
          userId
        })
        setApplications([])
        setUnreadCount(0)
        setIsLoading(false)
        return
      }

      // Step 4: Aggregate in memory (minimal processing)
      const unreadCountsByConv: Record<string, number> = {}
      unreadCounts?.forEach((row: { conversation_id: string; unread_count: number }) => {
        unreadCountsByConv[row.conversation_id] = Number(row.unread_count)
      })

      // Step 5: Build result (single pass)
      const appMap = new Map<string, ApplicationNotification>()
      
      conversations.forEach(conv => {
        const appId = conv.application_id
        if (!appId) return
        
        const app = (conv as any).applications
        const unread = unreadCountsByConv[conv.id] || 0
        
        if (unread > 0) {
          const existing = appMap.get(appId)
          if (existing) {
            existing.unread_count += unread
            if (conv.last_message_at && (!existing.last_message_at || conv.last_message_at > existing.last_message_at)) {
              existing.last_message_at = conv.last_message_at
            }
          } else {
            appMap.set(appId, {
              application_id: appId,
              application_name: app.application_name || `Application ${app.state}`,
              state: app.state,
              unread_count: unread,
              last_message_at: conv.last_message_at || ''
            })
          }
        }
      })

      const appNotifications = Array.from(appMap.values())
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

      setApplications(appNotifications)
      const totalUnread = appNotifications.reduce((sum, app) => sum + app.unread_count, 0)
      console.log('totalUnread', totalUnread)
      setUnreadCount(totalUnread)
      lastFetchRef.current = Date.now()
    } catch (err) {
      console.error('Error fetching applications with unread:', err)
      setApplications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [userRole, userId, supabase])

  // Quick badge count refresh function
  const refreshBadgeCount = useCallback(async () => {
    try {
      console.log('Refreshing badge count for:', { userRole, userId })
      let conversationIds: string[] = []
      
      if (userRole === 'admin') {
        // For admins, get all conversations (RLS will filter automatically)
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .limit(500) // Reasonable limit for admin
        
        conversationIds = conversations?.map(c => c.id) || []
      } else if (userRole === 'company_owner') {
        const { data } = await supabase
          .from('applications')
          .select('id')
          .eq('company_owner_id', userId)
        const applicationIds = data?.map(a => a.id) || []
        
        if (applicationIds.length === 0) {
          setUnreadCount(0)
          return
        }

        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .in('application_id', applicationIds)
        
        conversationIds = conversations?.map(c => c.id) || []
      } else if (userRole === 'expert') {
        const { data } = await supabase
          .from('applications')
          .select('id')
          .eq('assigned_expert_id', userId)
        const applicationIds = data?.map(a => a.id) || []
        
        if (applicationIds.length === 0) {
          setUnreadCount(0)
          return
        }

        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .in('application_id', applicationIds)
        
        conversationIds = conversations?.map(c => c.id) || []
      } else {
        setUnreadCount(0)
        return
      }

      if (conversationIds.length === 0) {
        setUnreadCount(0)
        return
      }

      // Validate inputs before calling RPC
      if (!userId || !Array.isArray(conversationIds) || conversationIds.length === 0) {
        console.warn('Invalid inputs for RPC call:', { userId, conversationIds: conversationIds.length })
        setUnreadCount(0)
        return
      }

      // Use RPC function to count unread messages (user ID not in is_read array)
      const { data: count, error: countError } = await supabase
        .rpc('get_total_unread_count_for_user', {
          conversation_ids: conversationIds,
          user_id: userId
        })

      if (countError) {
        console.error('Error counting unread messages:', {
          error: countError,
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
          code: countError.code,
          conversationIds: conversationIds.length,
          userId
        })
        // Don't set to 0 on error - keep previous count to avoid flickering
        // setUnreadCount(0)
      } else {
        console.log('Badge count updated:', { count, conversationIds: conversationIds.length })
        setUnreadCount(count || 0)
      }
    } catch (err) {
      console.error('Error refreshing badge:', err)
    }
  }, [userRole, userId, supabase])

  // Debounced refresh for badge count only
  const debouncedRefreshBadge = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      // Add a delay to ensure database transaction is fully committed before querying
      // This prevents race conditions where the query runs before the message is visible
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Always refresh badge count when message arrives (even if dropdown is open)
      await refreshBadgeCount()
      
      // If dropdown is open, also refresh the full list if cache expired
      // Add a small delay to ensure database transaction is committed before fetching
      if (isOpen) {
        const now = Date.now()
        if (now - lastFetchRef.current > CACHE_TTL) {
          // Wait a bit longer to ensure the new message is committed to the database
          setTimeout(() => {
            fetchApplicationsWithUnread()
          }, 500)
        }
      }
    }, DEBOUNCE_MS)
  }, [isOpen, refreshBadgeCount, fetchApplicationsWithUnread])

  // Set up real-time subscription with debouncing (after functions are defined)
  useEffect(() => {
    if (!userId || !userRole) return

    // Use unique channel name per user to avoid conflicts
    const channelName = `notification-messages-${userId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
          // Remove filter - we'll check in the callback to ensure reliability
        },
        async (payload) => {
          const newMessage = payload.new as any
          
          // Skip if message is from current user
          if (!newMessage || newMessage.sender_id === userId) {
            return
          }
          
          // Add a small delay to ensure database transaction is fully committed
          // This prevents race conditions where the query runs before the message is visible
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Refresh badge count
          console.log('Real-time INSERT event received, refreshing badge:', {
            messageId: newMessage.id,
            senderId: newMessage.sender_id,
            conversationId: newMessage.conversation_id
          })
          debouncedRefreshBadge()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
          // Remove filter - we'll check in the callback
        },
        async (payload) => {
          const updatedMessage = payload.new as any
          
          // Only refresh if message is from another user (not our own messages being marked as read)
          if (updatedMessage && updatedMessage.sender_id !== userId) {
            // Add a small delay to ensure the update is committed
            await new Promise(resolve => setTimeout(resolve, 200))
            
            console.log('Real-time UPDATE event received, refreshing badge:', {
              messageId: updatedMessage.id,
              senderId: updatedMessage.sender_id
            })
            debouncedRefreshBadge()
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status, { userRole, userId })
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates')
          // Refresh badge count when subscription is established
          refreshBadgeCount()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for channel:', channelName)
        }
      })

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole, debouncedRefreshBadge, refreshBadgeCount])

  const handleApplicationClick = (applicationId: string) => {
    setIsOpen(false)
    
    // Navigate based on user role with fromNotification flag
    if (userRole === 'admin') {
      router.push(`/admin/licenses/applications/${applicationId}?fromNotification=true`)
    } else if (userRole === 'company_owner') {
      router.push(`/dashboard/applications/${applicationId}?fromNotification=true`)
    } else if (userRole === 'expert') {
      router.push(`/dashboard/expert/messages?fromNotification=true&applicationId=${applicationId}`)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No messages'
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMins = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMs / 3600000)
    const diffInDays = Math.floor(diffInMs / 86400000)

    if (diffInMins < 1) return 'Just now'
    if (diffInMins < 60) return `${diffInMins}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer hover:text-blue-200 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? 0 : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Messages</h3>
            {unreadCount > 0 && (
              <span className="text-sm text-gray-600">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Applications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Loading messages...</p>
              </div>
            ) : applications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <div
                    key={app.application_id}
                    onClick={() => handleApplicationClick(app.application_id)}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer bg-blue-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-900">
                              {app.application_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {app.state} • {app.unread_count} unread {app.unread_count === 1 ? 'message' : 'messages'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {app.unread_count > 0 && (
                              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {app.unread_count > 9 ? 0 : app.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(app.last_message_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No unread messages</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}