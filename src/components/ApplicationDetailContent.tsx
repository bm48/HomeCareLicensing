'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  CheckSquare,
  MessageSquare,
  Send,
  Bot,
  Users
} from 'lucide-react'

interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  submitted_date: string | Date | null
  license_type_id?: string | null
  assigned_expert_id?: string | null
  company_owner_id?: string
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface Step {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_completed?: boolean
}

interface ApplicationDetailContentProps {
  application: Application
  documents: Document[]
  activeTab?: 'overview' | 'checklist' | 'documents' | 'ai-assistant'
  onTabChange?: (tab: 'overview' | 'checklist' | 'documents' | 'ai-assistant') => void
}

type TabType = 'overview' | 'checklist' | 'documents' | 'ai-assistant'
type OverviewTabType = 'next-steps' | 'documents' | 'quick-actions' | 'state-info' | 'messages'

export default function ApplicationDetailContent({
  application,
  documents: initialDocuments,
  activeTab: externalActiveTab,
  onTabChange
}: ApplicationDetailContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('overview')
  const [overviewTab, setOverviewTab] = useState<OverviewTabType>('next-steps')
  const activeTab = externalActiveTab ?? internalActiveTab
  const fromNotification = searchParams?.get('fromNotification') === 'true'
  
  const handleTabChange = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalActiveTab(tab)
    }
  }
  const [documents, setDocuments] = useState(initialDocuments)
  const [steps, setSteps] = useState<Step[]>([])
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [documentFilter, setDocumentFilter] = useState<'all' | 'pending' | 'drafts' | 'completed'>('all')
  const [licenseType, setLicenseType] = useState<any>(null)
  const [isLoadingLicenseType, setIsLoadingLicenseType] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expertProfile, setExpertProfile] = useState<{ full_name: string | null } | null>(null)
  const [isLoadingExpert, setIsLoadingExpert] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Fetch steps for the application
  const fetchSteps = useCallback(async () => {
    if (!application) return
    
    setIsLoadingSteps(true)
    try {
      // First, try to fetch application_steps (steps specific to this application)
      const { data: applicationSteps, error: appStepsError } = await supabase
        .from('application_steps')
        .select('*')
        .eq('application_id', application.id)
        .order('step_order', { ascending: true })

      if (appStepsError) {
        console.error('Error fetching application steps:', appStepsError)
      }

      // If application_steps exist, use them
      if (applicationSteps && applicationSteps.length > 0) {
        setSteps(applicationSteps.map((step: any) => ({
          id: step.id,
          step_name: step.step_name,
          step_order: step.step_order,
          description: step.description,
          is_completed: step.is_completed
        })))
        setIsLoadingSteps(false)
        return
      }

      // If no application_steps exist, fetch required steps from license_requirement_steps
      if (application.license_type_id && application.state) {
        // Get license type name
        const { data: licenseType, error: licenseTypeError } = await supabase
          .from('license_types')
          .select('name')
          .eq('id', application.license_type_id)
          .maybeSingle()

        if (licenseTypeError || !licenseType || !licenseType.name) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        // Find license_requirement_id for this state and license type
        const { data: licenseRequirement, error: reqError } = await supabase
          .from('license_requirements')
          .select('id')
          .eq('state', application.state)
          .eq('license_type', licenseType.name)
          .maybeSingle()

        if (reqError || !licenseRequirement) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        // Fetch required steps from license_requirement_steps
        const { data: requiredSteps, error: stepsError } = await supabase
          .from('license_requirement_steps')
          .select('*')
          .eq('license_requirement_id', licenseRequirement.id)
          .eq('is_expert_step', false)
          .order('step_order', { ascending: true })

        if (stepsError) {
          console.error('Error fetching required steps:', stepsError)
          setSteps([])
        } else {
          setSteps((requiredSteps || []).map((step: any) => ({
            id: step.id,
            step_name: step.step_name,
            step_order: step.step_order,
            description: step.description,
            is_completed: false
          })))
        }
      } else {
        setSteps([])
      }
    } catch (error) {
      console.error('Error fetching steps:', error)
      setSteps([])
    } finally {
      setIsLoadingSteps(false)
    }
  }, [application, supabase])

  useEffect(() => {
    fetchSteps()
  }, [fetchSteps])

  // Fetch license type data
  useEffect(() => {
    const fetchLicenseType = async () => {
      if (!application.license_type_id) return
      
      setIsLoadingLicenseType(true)
      try {
        const { data, error } = await supabase
          .from('license_types')
          .select('*')
          .eq('id', application.license_type_id)
          .single()

        if (error) throw error
        setLicenseType(data)
      } catch (error) {
        console.error('Error fetching license type:', error)
      } finally {
        setIsLoadingLicenseType(false)
      }
    }

    fetchLicenseType()
  }, [application.license_type_id, supabase])

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [supabase])

  // Fetch assigned expert profile - get full_name from user_profiles table
  useEffect(() => {
    const fetchExpertProfile = async () => {
      if (!application.assigned_expert_id) {
        setExpertProfile(null)
        return
      }

      setIsLoadingExpert(true)
      try {
        // Fetch expert's full_name from user_profiles table using assigned_expert_id
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', application.assigned_expert_id)
          .maybeSingle()

        if (error) {
          console.error('Error fetching expert profile:', error)
          setExpertProfile(null)
        } else {
          // Store expert profile with full_name
          setExpertProfile(data)
        }
      } catch (error) {
        console.error('Error fetching expert profile:', error)
        setExpertProfile(null)
      } finally {
        setIsLoadingExpert(false)
      }
    }

    fetchExpertProfile()
  }, [application.assigned_expert_id, supabase])

  // Fetch or create conversation for application-based group chat
  useEffect(() => {
    const setupConversation = async () => {
      if (!application.id || !currentUserId) {
        setMessages([])
        setConversationId(null)
        return
      }

      setIsLoadingConversation(true)
      try {
        // Find or create conversation for this application
        let convId = conversationId

        if (!convId) {
          // Try to find existing conversation for this application
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('application_id', application.id)
            .maybeSingle()

          if (existingConv) {
            convId = existingConv.id
            setConversationId(convId)
          } else {
            // Create new conversation for this application
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({
                application_id: application.id
              })
              .select()
              .single()
              console.log('newConv', newConv)

            if (convError) {
              console.error('Error creating conversation:', convError)
              setMessages([])
              setConversationId(null)
              setIsLoadingConversation(false)
              return
            }
            convId = newConv.id
            setConversationId(convId)
          }
        }

        // Load existing messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          setMessages([])
        } else if (!messagesData || messagesData.length === 0) {
          setMessages([])
        } else {
          // Get sender profiles
          const senderIds = Array.from(new Set(messagesData.map(m => m.sender_id)))
          
          const { data: userProfiles, error: profilesError } = senderIds.length > 0 ? await supabase
            .from('user_profiles')
            .select('id, full_name, role')
            .in('id', senderIds) : { data: [], error: null }

          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError)
          }

          const profilesById: Record<string, any> = {}
          userProfiles?.forEach(p => {
            profilesById[p.id] = p
          })

          const messagesWithSenders = messagesData.map(msg => ({
            ...msg,
            sender: {
              id: msg.sender_id,
              user_profiles: profilesById[msg.sender_id] || null
            },
            is_own: msg.sender_id === currentUserId
          }))

          setMessages(messagesWithSenders)

          // Mark messages as read by adding current user ID to is_read array
          // Use RPC function to add user ID to array for all unread messages
          const unreadMessages = messagesWithSenders.filter(msg => 
            msg.sender_id !== currentUserId && 
            (!msg.is_read || !Array.isArray(msg.is_read) || !msg.is_read.includes(currentUserId))
          )
          
          if (unreadMessages.length > 0) {
            // Update each message to add current user ID to is_read array
            for (const msg of unreadMessages) {
              await supabase.rpc('mark_message_as_read_by_user', {
                message_id: msg.id,
                user_id: currentUserId
              })
            }
          }
        }
      } catch (error) {
        console.error('Error setting up conversation:', error)
        setMessages([])
        setConversationId(null)
      } finally {
        setIsLoadingConversation(false)
      }
    }

    setupConversation()
  }, [application.id, currentUserId, supabase, conversationId])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = payload.new as any

          // Get sender information
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, full_name, role')
            .eq('id', newMessage.sender_id)
            .single()

          const messageWithSender = {
            ...newMessage,
            sender: {
              id: newMessage.sender_id,
              user_profiles: userProfile || null
            },
            is_own: newMessage.sender_id === currentUserId
          }

          // Add new message (avoid duplicates)
          setMessages(prevMessages => {
            const exists = prevMessages.some(m => m.id === newMessage.id)
            if (exists) return prevMessages

            const updated = [...prevMessages, messageWithSender]
            return updated.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })

          // DO NOT mark as read automatically when message arrives via real-time
          // Messages should only be marked as read when:
          // 1. User initially loads the conversation (handled in setupConversation)
          // 2. User manually views/interacts with the conversation
          // This ensures the notification badge updates correctly for unread messages

          // Scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // If coming from notification, scroll immediately after a short delay to ensure DOM is ready
      const delay = fromNotification ? 500 : 0
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: fromNotification ? 'auto' : 'smooth' })
      }, delay)
    }
  }, [messages, fromNotification])


  const handleSendMessage = async () => {
    console.log('sending..........')
    if (!messageContent.trim() || isSendingMessage || !currentUserId || !application.id) return

    setIsSendingMessage(true)
    try {
      let convId = conversationId

      // If no conversation exists, create one

      if (!convId) {
        // Try to find existing conversation for this application
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('application_id', application.id)
          .maybeSingle()


        if (existingConv) {
          convId = existingConv.id
          setConversationId(convId)
        } else {
          
          
          // Try to get client_id from the application's company_owner_id
          let clientId: string | null = null
          if (application.company_owner_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('company_owner_id', application.company_owner_id)
              .maybeSingle()
            
            if (client) {
              clientId = client.id
            }
          }
          
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              application_id: application.id,
              ...(clientId && { client_id: clientId })
            })
            .select()
            .single()


          if (convError) {
            throw new Error('Failed to create conversation. Please try again.')
          }
          convId = newConv.id
          setConversationId(convId)
        }
      }

      // Get current user profile for optimistic update
      const { data: currentUserProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('id', currentUserId)
        .single()


      // Send message
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: currentUserId,
          content: messageContent.trim()
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId)

      // Add message optimistically (real-time subscription will also catch it)
      if (newMessage) {
        const optimisticMessage = {
          ...newMessage,
          is_read: Array.isArray(newMessage.is_read) ? newMessage.is_read : [currentUserId], // Ensure array format
          sender: {
            id: currentUserId,
            user_profiles: currentUserProfile || null
          },
          is_own: true
        }
        setMessages(prev => [...prev, optimisticMessage])
      }

      // Clear message
      setMessageContent('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.message || 'Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${month} ${day}, ${time}`
  }

  const getSenderName = (message: any) => {
    if (message.is_own) {
      return 'Business Owner'
    }
    if (message.sender?.user_profiles?.full_name) {
      return message.sender.user_profiles.full_name
    }
    if (message.sender?.user_profiles?.role === 'expert') {
      return 'Expert'
    }
    if (message.sender?.user_profiles?.role === 'admin') {
      return 'Admin'
    }
    return 'User'
  }

  const getSenderRole = (message: any) => {
    if (message.is_own) {
      return 'Owner'
    }
    if (message.sender?.user_profiles?.role === 'expert') {
      return 'Expert'
    }
    if (message.sender?.user_profiles?.role === 'admin') {
      return 'Admin'
    }
    return 'Expert'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string, role: string) => {
    // Generate consistent color based on name
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const getRoleTagColor = (role: string) => {
    if (role === 'Expert') {
      return 'bg-purple-100 text-purple-700 border-purple-200'
    }
    if (role === 'Admin') {
      return 'bg-green-100 text-green-700 border-green-200'
    }
    if (role === 'Owner') {
      return 'bg-blue-100 text-blue-700 border-blue-200'
    }
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Calculate statistics
  const completedSteps = steps.filter(s => s.is_completed).length
  const totalSteps = steps.length
  const pendingTasks = totalSteps - completedSteps
  const completedDocuments = documents.filter(d => d.status === 'approved' || d.status === 'completed').length
  const totalDocuments = documents.length

  // Filter documents based on selected filter
  const filteredDocuments = documents.filter(doc => {
    if (documentFilter === 'all') return true
    if (documentFilter === 'completed') return doc.status === 'approved' || doc.status === 'completed'
    if (documentFilter === 'pending') return doc.status === 'pending'
    if (documentFilter === 'drafts') return doc.status === 'draft' || doc.status === 'in_progress'
    return true
  })

  const handleDownload = async (documentUrl: string, documentName: string) => {
    try {
      const response = await fetch(documentUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documentName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
      window.open(documentUrl, '_blank')
    }
  }

  const handleDownloadAll = () => {
    documents.forEach(doc => {
      setTimeout(() => handleDownload(doc.document_url, doc.document_name), 100)
    })
  }

  const getDocumentStatus = (status: string) => {
    if (status === 'approved' || status === 'completed') return 'completed'
    if (status === 'pending') return 'pending'
    return 'draft'
  }


  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{application.application_name}</h1>
            <p className="text-gray-600">Here&apos;s your licensing progress for {application.state}</p>
          </div>

          {/* Assigned Expert Section */}
          {application.assigned_expert_id && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 mb-1">Your Assigned Licensing Expert</div>
                  {isLoadingExpert ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-gray-600">Loading...</span>
                    </div>
                  ) : expertProfile?.full_name ? (
                    <div className="text-sm text-gray-900">{expertProfile.full_name}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Expert information unavailable</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm font-medium text-gray-600 mb-2">Overall Progress</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{application.progress_percentage || 0}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all"
                  style={{ width: `${application.progress_percentage || 0}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Completed Steps</div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{completedSteps} of {totalSteps}</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Pending Tasks</div>
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{pendingTasks} Items remaining</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Documents</div>
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{completedDocuments} of {totalDocuments} ready</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-1 px-6" aria-label="Tabs">
                {[
                  { id: 'next-steps' as OverviewTabType, label: 'Next Steps' },
                  { id: 'documents' as OverviewTabType, label: 'Documents' },
                  { id: 'quick-actions' as OverviewTabType, label: 'Quick Actions' },
                  { id: 'state-info' as OverviewTabType, label: 'State Info' },
                  { id: 'messages' as OverviewTabType, label: 'Messages' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOverviewTab(tab.id)}
                    className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors ${
                      overviewTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Next Steps Tab */}
              {overviewTab === 'next-steps' && (
                <div className="bg-white rounded-xl">
                  {isLoadingSteps ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : steps.filter(s => !s.is_completed).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">All steps completed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {steps
                        .filter(s => !s.is_completed)
                        .map((step) => (
                          <div key={step.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">{step.step_name}</div>
                              {step.description && (
                                <div className="text-sm text-gray-600 mb-2">{step.description}</div>
                              )}
                              <div className="flex gap-2">
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                  Licensing
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  <button 
                    onClick={() => handleTabChange('checklist')}
                    className="w-full mt-4 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Continue Checklist
                  </button>
                </div>
              )}

              {/* Documents Tab */}
              {overviewTab === 'documents' && (
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No documents yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => {
                        const status = getDocumentStatus(doc.status)
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{doc.document_name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {doc.document_type || 'Document'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : status === 'pending'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {status}
                              </span>
                              <button
                                onClick={() => handleDownload(doc.document_url, doc.document_name)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      Generate Docs
                    </button>
                    <button 
                      onClick={handleDownloadAll}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Packet
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions Tab */}
              {overviewTab === 'quick-actions' && (
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <Download className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Export Progress Report</span>
                  </button>
                </div>
              )}

              {/* State Info Tab */}
              {overviewTab === 'state-info' && (
                <div>
                  {isLoadingLicenseType ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : licenseType ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Average Processing Time</span>
                        <span className="font-semibold text-gray-900">{licenseType.processing_time_display || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Application Fee</span>
                        <span className="font-semibold text-gray-900">{licenseType.cost_display || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Renewal Period</span>
                        <span className="font-semibold text-gray-900">{licenseType.renewal_period_display || 'N/A'}</span>
                      </div>
                      <a 
                        href="#" 
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mt-4"
                      >
                        Learn more about {application.state} requirements
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No license type information available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Messages Tab */}
              {overviewTab === 'messages' && (
                <div>
                  {/* Messages List */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {isLoadingConversation ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start a conversation with your assigned expert</p>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => {
                          const senderName = getSenderName(message)
                          const senderRole = getSenderRole(message)
                          const initials = getInitials(senderName)
                          const roleTagColor = getRoleTagColor(senderRole)
                          const avatarColor = getAvatarColor(senderName, senderRole)
                          const isOwnMessage = message.is_own
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                            >
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                                {initials}
                              </div>
                              
                              {/* Message Content */}
                              <div className={`flex-1 min-w-0 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                                <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {senderName}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${roleTagColor}`}>
                                    {senderRole}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                </div>
                                <div className={`rounded-lg p-3 ${
                                  isOwnMessage 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-white'
                                }`}>
                                  <p className={`text-sm whitespace-pre-wrap ${
                                    isOwnMessage ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex gap-3">
                      <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || isSendingMessage || !conversationId}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isSendingMessage ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Checklist</h2>
              <p className="text-gray-600">Checklist content will be displayed here</p>
            </div>
          )}

      {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Generator</h1>
                <p className="text-gray-600">Generate and manage your licensing documents for {application.state}</p>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div className="text-sm font-medium text-gray-600">Completed</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {documents.filter(d => getDocumentStatus(d.status) === 'completed').length}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <div className="text-sm font-medium text-gray-600">In Progress</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {documents.filter(d => getDocumentStatus(d.status) === 'draft').length}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6 text-orange-600" />
                    <div className="text-sm font-medium text-gray-600">Pending</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {documents.filter(d => getDocumentStatus(d.status) === 'pending').length}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-4 px-6" aria-label="Tabs">
                    {[
                      { id: 'all', label: `All Documents (${documents.length})` },
                      { id: 'pending', label: `Pending (${documents.filter(d => getDocumentStatus(d.status) === 'pending').length})` },
                      { id: 'drafts', label: `Drafts (${documents.filter(d => getDocumentStatus(d.status) === 'draft').length})` },
                      { id: 'completed', label: `Completed (${documents.filter(d => getDocumentStatus(d.status) === 'completed').length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDocumentFilter(tab.id as typeof documentFilter)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          documentFilter === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Documents List */}
                <div className="p-6">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>No documents found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDocuments.map((doc) => {
                        const status = getDocumentStatus(doc.status)
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <FileText className="w-6 h-6 text-gray-400" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">{doc.document_name}</div>
                                <div className="text-sm text-gray-600">
                                  {doc.document_type || 'Document'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                status === 'completed'
                                  ? 'bg-gray-900 text-white'
                                  : status === 'pending'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {status}
                              </span>
                              <button
                                onClick={() => handleDownload(doc.document_url, doc.document_name)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </div>
                          </div>
                        )
                      })}
            </div>
          )}
        </div>
      </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleDownloadAll}
                  className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download All Documents
                </button>
                <button className="flex-1 px-6 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  Generate Submission Packet
                </button>
              </div>
            </div>
          )}

      {activeTab === 'ai-assistant' && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h2>
              <p className="text-gray-600">AI Assistant content will be displayed here</p>
            </div>
          )}
    </div>
  )
}
