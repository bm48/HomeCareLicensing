'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Download,
  Calendar,
  MapPin,
  User,
  Clock,
  Percent,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Mail,
  Users,
  Send
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
  created_at: string | Date | null
  company_owner_id: string
  assigned_expert_id?: string | null
  license_type_id?: string | null
  revision_reason?: string | null
  user_profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  expert_profile: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface ApplicationStep {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_completed?: boolean
}

interface AdminApplicationDetailContentProps {
  application: Application
  documents: Document[]
  adminUserId: string
}

export default function AdminApplicationDetailContent({
  application,
  documents: initialDocuments,
  adminUserId
}: AdminApplicationDetailContentProps) {
  const searchParams = useSearchParams()
  const fromNotification = searchParams?.get('fromNotification') === 'true'
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [steps, setSteps] = useState<ApplicationStep[]>([])
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700'
      case 'needs_revision':
        return 'bg-orange-100 text-orange-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
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

  // Set up conversation for application-based group chat
  useEffect(() => {
    if (!application.id || !adminUserId) return

    const setupConversation = async () => {
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
              console.error('Error creating conversation:', convError)
              setIsLoadingConversation(false)
              return
            }

            convId = newConv.id
            setConversationId(convId)
          }
        }

        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          setMessages([])
        } else {
          // Get sender profiles
          const senderIds = Array.from(new Set((messagesData || []).map(m => m.sender_id)))
          const { data: userProfiles } = senderIds.length > 0 ? await supabase
            .from('user_profiles')
            .select('id, full_name, role')
            .in('id', senderIds) : { data: [] }

          const profilesById: Record<string, any> = {}
          userProfiles?.forEach(p => {
            profilesById[p.id] = p
          })

          const messagesWithSenders = (messagesData || []).map(msg => ({
            ...msg,
            sender: {
              id: msg.sender_id,
              user_profiles: profilesById[msg.sender_id] || null
            },
            is_own: msg.sender_id === adminUserId
          }))

          setMessages(messagesWithSenders)

        // Mark messages as read by adding admin user ID to is_read array
        const unreadMessages = messagesWithSenders.filter(msg => 
          msg.sender_id !== adminUserId && 
          (!msg.is_read || !Array.isArray(msg.is_read) || !msg.is_read.includes(adminUserId))
        )
        
        if (unreadMessages.length > 0) {
          // Update each message to add admin user ID to is_read array
          for (const msg of unreadMessages) {
            await supabase.rpc('mark_message_as_read_by_user', {
              message_id: msg.id,
              user_id: adminUserId
            })
          }
        }
        }
      } catch (error) {
        console.error('Error setting up conversation:', error)
        setMessages([])
      } finally {
        setIsLoadingConversation(false)
      }
    }

    setupConversation()
  }, [application.id, adminUserId, supabase, conversationId])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !adminUserId) return

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
            .maybeSingle()

          const messageWithSender = {
            ...newMessage,
            sender: {
              id: newMessage.sender_id,
              user_profiles: userProfile || null
            },
            is_own: newMessage.sender_id === adminUserId
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
          // 1. Admin initially loads the conversation (handled in setupConversation)
          // 2. Admin manually views/interacts with the conversation
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
  }, [conversationId, adminUserId, supabase])

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
    if (!messageContent.trim() || isSendingMessage || !conversationId || !adminUserId) return

    setIsSendingMessage(true)
    try {
      // Get current user profile for optimistic update
      const { data: currentUserProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('id', adminUserId)
        .single()

      // Send message
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: adminUserId,
          content: messageContent.trim()
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Add message optimistically
      if (newMessage) {
        const optimisticMessage = {
          ...newMessage,
          is_read: Array.isArray(newMessage.is_read) ? newMessage.is_read : [adminUserId], // Ensure array format
          sender: {
            id: adminUserId,
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
      return 'Admin'
    }
    if (message.sender?.user_profiles?.full_name) {
      return message.sender.user_profiles.full_name
    }
    return 'Client'
  }

  const getSenderRole = (message: any) => {
    if (message.is_own) {
      return 'Admin'
    }
    if (message.sender?.user_profiles?.role === 'expert') {
      return 'Expert'
    }
    if (message.sender?.user_profiles?.role === 'admin') {
      return 'Admin'
    }
    return 'Owner'
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

  const completedSteps = steps.filter(s => s.is_completed).length
  const totalSteps = steps.length

  // Tab state
  const [activeTab, setActiveTab] = useState<'steps' | 'documents' | 'messages'>('steps')

  return (
    <div className="space-y-6">
      {/* Application Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {getStateAbbr(application.state)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{application.application_name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {application.state}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {formatDate(application.created_at)}
                </span>
                {application.started_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started {formatDate(application.started_date)}
                  </span>
                )}
                {application.progress_percentage !== null && (
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    {application.progress_percentage}% Complete
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusBadge(application.status)}`}>
            {getStatusDisplay(application.status)}
          </span>
        </div>

        {/* Progress Bar */}
        {application.progress_percentage !== null && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${application.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Owner/Client Information */}
        {application.user_profiles && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{application.user_profiles.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Email:</span>
                <span>{application.user_profiles.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expert Information */}
        {application.expert_profile && (
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Expert
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{application.expert_profile.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Email:</span>
                <span>{application.expert_profile.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Revision Reason (if needs_revision) */}
        {application.status === 'needs_revision' && application.revision_reason && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Revision Required
            </h3>
            <p className="text-sm text-orange-800">{application.revision_reason}</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Overall Progress</div>
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{application.progress_percentage || 0}%</div>
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
            <div className="text-sm font-medium text-gray-600">Documents</div>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{documents.length}</div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'steps'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            > Steps
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >Documents
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'messages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >Messages
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Application Steps Tab */}
          {activeTab === 'steps' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Application Steps</h2>
              {isLoadingSteps ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No steps found for this application</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg ${
                        step.is_completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="mt-1">
                        {step.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">{step.step_name}</div>
                        {step.description && (
                          <div className="text-sm text-gray-600 mb-2">{step.description}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Step {step.step_order} of {totalSteps}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Application Documents</h2>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{doc.document_name}</div>
                          <div className="text-sm text-gray-500">
                            Uploaded {formatDate(doc.created_at)}
                            {doc.document_type && ` • ${doc.document_type}`}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          doc.status === 'approved' || doc.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : doc.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownload(doc.document_url, doc.document_name)}
                        className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Application Messages</h2>
              <p className="text-sm text-gray-600 mb-6">Communicate with your team about this application</p>
              
              {/* Messages List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {isLoadingConversation ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start a conversation with the client</p>
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
                            <div className={`rounded-lg p-3 max-w-[80%] ${
                              isOwnMessage 
                                ? 'bg-blue-600 text-white' 
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
  )
}
