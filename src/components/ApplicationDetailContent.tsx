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
  Users,
  Upload,
  X,
  Check,
  AlertCircle,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react'
import UploadDocumentModal from './UploadDocumentModal'
import Modal from './Modal'

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
  description?: string | null
  expert_review_notes?: string | null
}

interface Step {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_completed?: boolean
  is_expert_step?: boolean
  created_by_expert_id?: string | null
}

interface ApplicationDetailContentProps {
  application: Application
  documents: Document[]
  activeTab?: 'overview' | 'checklist' | 'documents' | 'ai-assistant' | 'next-steps' | 'quick-actions' | 'requirements' | 'message' | 'expert-process'
  onTabChange?: (tab:  'next-steps' | 'quick-actions' | 'requirements' | 'message' | 'expert-process') => void
  showInlineTabs?: boolean // If true, show tabs under summary blocks instead of in sidebar
}

type TabType =  'next-steps' | 'quick-actions' | 'requirements' | 'message' | 'expert-process'

export default function ApplicationDetailContent({
  application,
  documents: initialDocuments,
  activeTab: externalActiveTab,
  onTabChange,
  showInlineTabs = false
}: ApplicationDetailContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>(showInlineTabs ? 'next-steps' : 'message')
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
  const [expertProfile, setExpertProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null)
  const [isLoadingExpert, setIsLoadingExpert] = useState(false)
  const [clientProfile, setClientProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null)
  const [isLoadingClient, setIsLoadingClient] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [isCompletingStep, setIsCompletingStep] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocumentForReview, setSelectedDocumentForReview] = useState<Document | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [expertSteps, setExpertSteps] = useState<Step[]>([])
  const [isLoadingExpertSteps, setIsLoadingExpertSteps] = useState(false)
  const [showExpertStepForm, setShowExpertStepForm] = useState(false)
  const [expertStepFormData, setExpertStepFormData] = useState({ stepName: '', description: '' })
  const [editingExpertStep, setEditingExpertStep] = useState<string | null>(null)
  const [isSubmittingExpertStep, setIsSubmittingExpertStep] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Refresh documents
  const refreshDocuments = useCallback(async () => {
    if (!application.id) return
    try {
      const { data, error } = await supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (data) {
        setDocuments(data.map((doc: any) => ({
          id: doc.id,
          document_name: doc.document_name,
          document_url: doc.document_url,
          document_type: doc.document_type,
          status: doc.status,
          created_at: doc.created_at,
          description: doc.description || null,
          expert_review_notes: doc.expert_review_notes || null
        })))
      }
    } catch (error) {
      console.error('Error refreshing documents:', error)
    }
  }, [application.id, supabase])

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

      // If application_steps exist, separate regular steps from expert steps
      if (applicationSteps && applicationSteps.length > 0) {
        const regularSteps = applicationSteps
          .filter((step: any) => !step.is_expert_step)
          .map((step: any) => ({
            id: step.id,
            step_name: step.step_name,
            step_order: step.step_order,
            description: step.description,
            is_completed: step.is_completed,
            is_expert_step: false
          }))
        
        const expertStepsData = applicationSteps
          .filter((step: any) => step.is_expert_step)
          .map((step: any) => ({
            id: step.id,
            step_name: step.step_name,
            step_order: step.step_order,
            description: step.description,
            is_completed: step.is_completed,
            is_expert_step: true,
            created_by_expert_id: step.created_by_expert_id
          }))
        
        setSteps(regularSteps)
        setExpertSteps(expertStepsData)
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

  // Fetch expert steps separately
  const fetchExpertSteps = useCallback(async () => {
    if (!application.id) return
    
    setIsLoadingExpertSteps(true)
    try {
      const { data: expertStepsData, error } = await supabase
        .from('application_steps')
        .select('*')
        .eq('application_id', application.id)
        .eq('is_expert_step', true)
        .order('step_order', { ascending: true })

      if (error) {
        console.error('Error fetching expert steps:', error)
        setExpertSteps([])
      } else {
        setExpertSteps((expertStepsData || []).map((step: any) => ({
          id: step.id,
          step_name: step.step_name,
          step_order: step.step_order,
          description: step.description,
          is_completed: step.is_completed,
          is_expert_step: true,
          created_by_expert_id: step.created_by_expert_id
        })))
      }
    } catch (error) {
      console.error('Error fetching expert steps:', error)
      setExpertSteps([])
    } finally {
      setIsLoadingExpertSteps(false)
    }
  }, [application.id, supabase])

  useEffect(() => {
    if (activeTab === 'expert-process') {
      fetchExpertSteps()
    }
  }, [activeTab, fetchExpertSteps])

  // Handle expert step operations
  const handleAddExpertStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!application.id || !currentUserId || isSubmittingExpertStep) return
    if (!expertStepFormData.stepName.trim()) {
      alert('Please enter a step name')
      return
    }

    setIsSubmittingExpertStep(true)
    try {
      // Get the highest step_order for expert steps in this application
      const { data: existingSteps } = await supabase
        .from('application_steps')
        .select('step_order')
        .eq('application_id', application.id)
        .eq('is_expert_step', true)
        .order('step_order', { ascending: false })
        .limit(1)

      const nextOrder = existingSteps && existingSteps.length > 0 
        ? existingSteps[0].step_order + 1 
        : 1

      const { error: insertError } = await supabase
        .from('application_steps')
        .insert({
          application_id: application.id,
          step_name: expertStepFormData.stepName.trim(),
          step_order: nextOrder,
          description: expertStepFormData.description.trim() || null,
          is_expert_step: true,
          created_by_expert_id: currentUserId,
          is_completed: false
        })

      if (insertError) throw insertError

      // Reset form and refresh
      setExpertStepFormData({ stepName: '', description: '' })
      setShowExpertStepForm(false)
      await fetchExpertSteps()
    } catch (error: any) {
      console.error('Error adding expert step:', error)
      alert('Failed to add expert step: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmittingExpertStep(false)
    }
  }

  const handleEditExpertStep = (step: Step) => {
    setEditingExpertStep(step.id)
    setExpertStepFormData({
      stepName: step.step_name,
      description: step.description || ''
    })
    setShowExpertStepForm(true)
  }

  const handleUpdateExpertStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpertStep || isSubmittingExpertStep) return

    setIsSubmittingExpertStep(true)
    try {
      const { error } = await supabase
        .from('application_steps')
        .update({
          step_name: expertStepFormData.stepName.trim(),
          description: expertStepFormData.description.trim() || null
        })
        .eq('id', editingExpertStep)

      if (error) throw error

      // Reset form and refresh
      setExpertStepFormData({ stepName: '', description: '' })
      setEditingExpertStep(null)
      setShowExpertStepForm(false)
      await fetchExpertSteps()
    } catch (error: any) {
      console.error('Error updating expert step:', error)
      alert('Failed to update expert step: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmittingExpertStep(false)
    }
  }

  const handleDeleteExpertStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this expert step?')) return

    try {
      const { error } = await supabase
        .from('application_steps')
        .delete()
        .eq('id', stepId)
        .eq('is_expert_step', true)

      if (error) throw error

      await fetchExpertSteps()
    } catch (error: any) {
      console.error('Error deleting expert step:', error)
      alert('Failed to delete expert step: ' + (error.message || 'Unknown error'))
    }
  }

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

  // Fetch expert profile (for clients)
  useEffect(() => {
    const fetchExpertProfile = async () => {
      if (!application.assigned_expert_id) {
        setExpertProfile(null)
        return
      }
      
      setIsLoadingExpert(true)
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', application.assigned_expert_id)
          .single()

        if (error) throw error
        setExpertProfile(data)
      } catch (error) {
        console.error('Error fetching expert profile:', error)
        setExpertProfile(null)
      } finally {
        setIsLoadingExpert(false)
      }
    }

    fetchExpertProfile()
  }, [application.assigned_expert_id, supabase])

  // Fetch client profile (for experts)
  useEffect(() => {
    const fetchClientProfile = async () => {
      if (!application.company_owner_id) {
        setClientProfile(null)
        return
      }
      
      setIsLoadingClient(true)
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', application.company_owner_id)
          .single()

        if (error) throw error
        setClientProfile(data)
      } catch (error) {
        console.error('Error fetching client profile:', error)
        setClientProfile(null)
      } finally {
        setIsLoadingClient(false)
      }
    }

    fetchClientProfile()
  }, [application.company_owner_id, supabase])

  // Get current user ID and role
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Get user profile to determine role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentUserRole(profile.role)
        }
      }
    }
    getCurrentUser()
  }, [supabase])

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
          // Create new conversation for this application
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              application_id: application.id
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
    // Use sender's actual profile information
    if (message.sender?.user_profiles?.full_name) {
      return message.sender.user_profiles.full_name
    }
    // Fallback to role-based names if no full name
    if (message.sender?.user_profiles?.role === 'expert') {
      return 'Expert'
    }
    if (message.sender?.user_profiles?.role === 'company_owner') {
      return 'Business Owner'
    }
    if (message.sender?.user_profiles?.role === 'admin') {
      return 'Admin'
    }
    return 'User'
  }

  const getSenderRole = (message: any) => {
    // Determine role based on sender's actual role from user_profiles
    const senderRole = message.sender?.user_profiles?.role
    
    if (senderRole === 'expert') {
      return 'Expert'
    }
    if (senderRole === 'company_owner') {
      return 'Owner'
    }
    if (senderRole === 'admin') {
      return 'Admin'
    }
    // Default fallback - try to infer from application context
    // If sender is the company owner, they're an Owner
    if (message.sender?.id === application.company_owner_id) {
      return 'Owner'
    }
    // If sender is the assigned expert, they're an Expert
    if (message.sender?.id === application.assigned_expert_id) {
      return 'Expert'
    }
    // Last resort default
    return 'User'
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

  // Handle step completion
  const handleCompleteStep = async () => {
    if (!selectedStepId || !application.id || isCompletingStep) return

    setIsCompletingStep(true)
    try {
      // Find the selected step
      const selectedStep = steps.find(s => s.id === selectedStepId)
      if (!selectedStep) {
        throw new Error('Step not found')
      }

      // First, check if an application_steps entry exists with this ID
      const { data: existingAppStep } = await supabase
        .from('application_steps')
        .select('id')
        .eq('application_id', application.id)
        .eq('id', selectedStepId)
        .maybeSingle()

      if (existingAppStep) {
        // Update existing application_steps entry
        const { error: updateError } = await supabase
          .from('application_steps')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', selectedStepId)
          .eq('application_id', application.id)

        if (updateError) throw updateError
      } else {
        // Step doesn't exist in application_steps yet
        // Check if it exists by step_name and step_order (in case it was created differently)
        const { data: existingByName } = await supabase
          .from('application_steps')
          .select('id')
          .eq('application_id', application.id)
          .eq('step_name', selectedStep.step_name)
          .eq('step_order', selectedStep.step_order)
          .maybeSingle()

        if (existingByName) {
          // Update by step_name and step_order
          const { error: updateError } = await supabase
            .from('application_steps')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString()
            })
            .eq('id', existingByName.id)
            .eq('application_id', application.id)

          if (updateError) throw updateError
        } else {
          // Create new application_steps entry
          const { error: insertError } = await supabase
            .from('application_steps')
            .insert({
              application_id: application.id,
              step_name: selectedStep.step_name,
              step_order: selectedStep.step_order,
              description: selectedStep.description,
              is_completed: true,
              completed_at: new Date().toISOString()
            })

          if (insertError) throw insertError
        }
      }

      // Refresh steps to reflect the update
      await fetchSteps()
      
      // Clear selection
      setSelectedStepId(null)
    } catch (error: any) {
      console.error('Error completing step:', error)
      alert('Failed to complete step: ' + (error.message || 'Unknown error'))
    } finally {
      setIsCompletingStep(false)
    }
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
    if (documentFilter === 'completed') return doc.status === 'approved' 
    if (documentFilter === 'pending') return doc.status === 'pending'
    if (documentFilter === 'drafts') return doc.status === 'rejected' 
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
    if (status === 'rejected') return 'draft'
    return 'draft'
  }

  // Handle document approval/rejection by expert
  const handleDocumentReview = async (action: 'approve' | 'reject') => {
    if (!selectedDocumentForReview || !currentUserId || isReviewing) return

    setIsReviewing(true)
    try {
      const { error } = await supabase
        .from('application_documents')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          expert_review_notes: reviewNotes.trim() || null
        })
        .eq('id', selectedDocumentForReview.id)

      if (error) throw error

      // Refresh documents
      await refreshDocuments()
      
      // Close modal and reset
      setSelectedDocumentForReview(null)
      setReviewNotes('')
    } catch (error: any) {
      console.error('Error reviewing document:', error)
      alert('Failed to review document: ' + (error.message || 'Unknown error'))
    } finally {
      setIsReviewing(false)
    }
  }


  // Summary blocks - always shown
  const summaryBlocks = (
    <>
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{application.application_name}</h1>
        <p className="text-gray-600">Here&apos;s your licensing progress for {application.state}</p>
      </div>

      {/* Assigned Expert Block (for clients) or Client Info Block (for experts) */}
      {currentUserRole === 'expert' ? (
        // Show client info when user is an expert
        clientProfile && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900 mb-1">Client Information</div>
                <div className="text-base font-medium text-gray-900">{clientProfile.full_name || 'Client'}</div>
                {clientProfile.email && (
                  <div className="text-sm text-gray-600 mt-1">{clientProfile.email}</div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        // Show expert info when user is a client
        expertProfile && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900 mb-1">Your Assigned Licensing Expert</div>
                <div className="text-base font-medium text-gray-900">{expertProfile.full_name || 'Expert'}</div>
              </div>
            </div>
          </div>
        )
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
    </>
  )

  // Tab navigation UI
  const tabNavigation = showInlineTabs ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 -mt-2">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-6" aria-label="Tabs">
          {[
            { id: 'next-steps', label: 'Next Steps' },
            { id: 'documents', label: 'Documents' },
            { id: 'requirements', label: 'State Info' },
            { id: 'message', label: 'Messages' },
            ...(currentUserRole === 'expert' ? [{ id: 'expert-process', label: 'Expert Process' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-6">
      {/* Summary Blocks - Always visible */}
      {summaryBlocks}

      {/* Tab Navigation - Only when showInlineTabs is true */}
      {tabNavigation}

      {/* Tab Content */}
      {activeTab === 'overview' && (
      <div className="space-y-6">
              {/* Next Steps and Documents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Next Steps */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
                    <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
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
                        .slice(0, 3)
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
                  <button className="w-full mt-4 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
                    Continue Checklist
                  </button>
          </div>

                {/* Documents */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                    <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
          {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No documents yet</p>
            </div>
          ) : (
            <div className="space-y-3">
                      {documents.slice(0, 2).map((doc) => (
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
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            completed
                        </span>
                      </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      Generate Docs
                    </button>
                    <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Packet
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions and State-Specific Requirements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                

                {/* State-Specific Requirements */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">State-Specific Requirements</h2>
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
              </div>

              {/* Application Messages */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Application Messages</h2>
                  <p className="text-sm text-gray-600">Communicate with your team about this application</p>
                </div>
                <div className="p-6">
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
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white border border-gray-200'
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
              </div>
            </div>
          )}

      {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Checklist</h2>
                <p className="text-gray-600">Checklist content will be displayed here</p>
              </div>
            </div>
          )}

      {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Generator</h1>
                  <p className="text-gray-600">Generate and manage your licensing documents for {application.state}</p>
                </div>
                {/* Upload button - only for clients (company owners) */}
                {currentUserRole === 'company_owner' && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Document
                  </button>
                )}
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
                        const isExpert = currentUserRole === 'expert'
                        const isPending = doc.status === 'pending'
                        return (
                          <div
                            key={doc.id}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <FileText className="w-6 h-6 text-gray-400 mt-1" />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 mb-1">{doc.document_name}</div>
                                  {doc.description && (
                                    <div className="text-sm text-gray-600 mb-2">{doc.description}</div>
                                  )}
                                  <div className="text-sm text-gray-500">
                                    {doc.document_type || 'Document'} • Uploaded {formatDate(doc.created_at)}
                                  </div>
                                  {doc.expert_review_notes && (
                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
                                      <span className="font-medium">Expert Review: </span>
                                      {doc.expert_review_notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
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
                                {/* Expert review buttons - only show for experts on pending documents */}
                                {isExpert && isPending && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedDocumentForReview(doc)
                                        setReviewNotes('')
                                      }}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                      <X className="w-4 h-4" />
                                      Review
                                    </button>
                                  </>
                                )}
                              </div>
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

      {/* New tabs for inline display */}
      {activeTab === 'next-steps' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
            </div>
            {isLoadingSteps ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No steps found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step) => {
                  const isCompleted = step.is_completed
                  const isSelected = selectedStepId === step.id
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => !isCompleted && setSelectedStepId(step.id === selectedStepId ? null : step.id)}
                      className={`flex items-start gap-3 p-3 border rounded-lg transition-all ${
                        isCompleted
                          ? 'bg-green-50 border-green-200'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className={`w-5 h-5 border-2 rounded-full ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Complete Button - appears at bottom when step is selected */}
          {selectedStepId && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Selected: {steps.find(s => s.id === selectedStepId)?.step_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click Complete to mark this step as finished
                  </p>
                </div>
                <button
                  onClick={handleCompleteStep}
                  disabled={isCompletingStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {isCompletingStep ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Complete
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {activeTab === 'requirements' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">State-Specific Requirements</h2>
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
        </div>
      )}

      {activeTab === 'expert-process' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Expert Process Steps</h2>
              {currentUserRole === 'expert' && (
                <button
                  onClick={() => {
                    setShowExpertStepForm(!showExpertStepForm)
                    setExpertStepFormData({ stepName: '', description: '' })
                    setEditingExpertStep(null)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              )}
            </div>

            {/* Add/Edit Expert Step Form */}
            {showExpertStepForm && currentUserRole === 'expert' && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingExpertStep ? 'Edit Expert Step' : 'Add New Expert Step'}
                </h3>
                <form onSubmit={editingExpertStep ? handleUpdateExpertStep : handleAddExpertStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
                    <input
                      type="text"
                      value={expertStepFormData.stepName}
                      onChange={(e) => setExpertStepFormData({ ...expertStepFormData, stepName: e.target.value })}
                      placeholder="e.g., Initial Client Consultation"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={expertStepFormData.description}
                      onChange={(e) => setExpertStepFormData({ ...expertStepFormData, description: e.target.value })}
                      placeholder="Detailed description of this step"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingExpertStep}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmittingExpertStep ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Save Step
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExpertStepForm(false)
                        setExpertStepFormData({ stepName: '', description: '' })
                        setEditingExpertStep(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isLoadingExpertSteps ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : expertSteps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No expert process steps added yet</p>
                {currentUserRole === 'expert' && (
                  <p className="text-xs mt-1">Add steps to define your process for this application</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {expertSteps.map((step) => (
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
                        Step {step.step_order} of {expertSteps.length}
                      </div>
                    </div>
                    {currentUserRole === 'expert' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditExpertStep(step)}
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Edit step"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpertStep(step.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'message' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Application Messages</h2>
              <p className="text-sm text-gray-600">Communicate with your team about this application</p>
            </div>
            <div className="p-6">
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
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        applicationId={application.id}
        onSuccess={refreshDocuments}
      />

      {/* Document Review Modal for Experts */}
      {selectedDocumentForReview && (
        <Modal
          isOpen={!!selectedDocumentForReview}
          onClose={() => {
            setSelectedDocumentForReview(null)
            setReviewNotes('')
          }}
          title={`Review Document: ${selectedDocumentForReview.document_name}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Document: <span className="font-medium text-gray-900">{selectedDocumentForReview.document_name}</span>
              </p>
              {selectedDocumentForReview.description && (
                <p className="text-sm text-gray-600 mb-4">
                  Description: {selectedDocumentForReview.description}
                </p>
              )}
              <a
                href={selectedDocumentForReview.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                View Document
              </a>
            </div>

            <div>
              <label htmlFor="reviewNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                Review Notes (Optional)
              </label>
              <textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about your review decision..."
                rows={4}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedDocumentForReview(null)
                  setReviewNotes('')
                }}
                disabled={isReviewing}
                className="px-6 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDocumentReview('reject')}
                disabled={isReviewing}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Reject
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDocumentReview('approve')}
                disabled={isReviewing}
                className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
