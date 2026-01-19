'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  Bot
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

export default function ApplicationDetailContent({
  application,
  documents: initialDocuments,
  activeTab: externalActiveTab,
  onTabChange
}: ApplicationDetailContentProps) {
  const router = useRouter()
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('overview')
  const activeTab = externalActiveTab ?? internalActiveTab
  
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
  const [assignedExpert, setAssignedExpert] = useState<any>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [expertRecordId, setExpertRecordId] = useState<string | null>(null)
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

  // Fetch or create conversation with assigned expert
  useEffect(() => {
    const setupConversation = async () => {
      if (!application.assigned_expert_id || !currentUserId) {
        setMessages([])
        setConversationId(null)
        return
      }

      setIsLoadingConversation(true)
      try {
         // Get client_id from company_owner_id
         const { data: client, error: clientError } = await supabase
           .from('clients')
           .select('id')
           .eq('company_owner_id', application.company_owner_id)
           .maybeSingle()

         if (clientError) {
           console.error('Error fetching client:', clientError)
           setMessages([])
           setConversationId(null)
           setClientId(null)
           setIsLoadingConversation(false)
           return
         }

         if (!client) {
           console.warn('Client record not found for company_owner_id:', application.company_owner_id)
           setMessages([])
           setConversationId(null)
           setClientId(null)
           setIsLoadingConversation(false)
           return
         }

        setClientId(client.id)

        // Get expert record (licensing_experts.id) from user_id
        const { data: expertRecord, error: expertError } = await supabase
          .from('licensing_experts')
          .select('id, first_name, last_name')
          .eq('user_id', application.assigned_expert_id)
          .maybeSingle()

        console.log("expertRecord*********: ",expertRecord)

        if (expertError) {
          console.error('Error fetching expert:', expertError)
          setMessages([])
          setConversationId(null)
          setIsLoadingConversation(false)
          return
        }

        if (!expertRecord) {
          console.warn('Expert record not found for assigned_expert_id:', application.assigned_expert_id)
          setMessages([])
          setConversationId(null)
          setExpertRecordId(null)
          setIsLoadingConversation(false)
          return
        }

        setExpertRecordId(expertRecord.id)
        setAssignedExpert({
          id: expertRecord.id,
          user_id: application.assigned_expert_id,
          first_name: expertRecord.first_name,
          last_name: expertRecord.last_name
        })

        // Find or create conversation
        // First, try to find any conversation with messages for this client/expert pair
        const { data: allConvsForPair } = await supabase
          .from('conversations')
          .select('id, client_id, expert_id')
          .eq('client_id', client.id)
          .eq('expert_id', expertRecord.id)
          .is('admin_id', null)

        console.log('All conversations for client/expert pair:', allConvsForPair)

        // Check if any of these conversations have messages
        let convWithMessages = null
        if (allConvsForPair && allConvsForPair.length > 0) {
          const convIds = allConvsForPair.map(c => c.id)
          const { data: messagesInConvs } = await supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', convIds)
            .limit(1)

          if (messagesInConvs && messagesInConvs.length > 0) {
            convWithMessages = messagesInConvs[0].conversation_id
            console.log('Found conversation with messages:', convWithMessages)
          }
        }

        const { data: existingConv, error: convLookupError } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', client.id)
          .eq('expert_id', expertRecord.id)
          .is('admin_id', null)
          .maybeSingle()

        if (convLookupError) {
          console.error('Error looking up conversation:', convLookupError)
        }

        let convId: string
        if (convWithMessages) {
          // Use the conversation that has messages
          convId = convWithMessages
          console.log('Using conversation with messages:', convId)
        } else if (existingConv) {
          convId = existingConv.id
          console.log('Found existing conversation:', convId)
        } else {
          // Create new conversation
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              client_id: client.id,
              expert_id: expertRecord.id,
              admin_id: null
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
          console.log('Created new conversation:', convId)
        }

        setConversationId(convId)

        // Load existing messages
        console.log('Loading messages for conversation:', convId, 'client_id:', client.id, 'expert_id:', expertRecord.id)
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })

        console.log('Messages query result:', { 
          messagesData, 
          messagesError, 
          count: messagesData?.length || 0,
          conversationId: convId
        })

        // If no messages found, check if there are any messages in other conversations for this client/expert pair
        if ((!messagesData || messagesData.length === 0) && existingConv) {
          console.log('No messages in current conversation, checking all conversations for this client/expert...')
          const { data: allConversations } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', client.id)
            .eq('expert_id', expertRecord.id)
            .is('admin_id', null)

          if (allConversations && allConversations.length > 0) {
            const conversationIds = allConversations.map(c => c.id)
            console.log('Found', conversationIds.length, 'conversations, checking for messages...')
            
            const { data: allMessages } = await supabase
              .from('messages')
              .select('*')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: true })

            if (allMessages && allMessages.length > 0) {
              console.log('Found', allMessages.length, 'messages in other conversations, using conversation:', allConversations[0].id)
              // Use the first conversation that has messages
              const activeConvId = allMessages[0].conversation_id
              setConversationId(activeConvId)
              
              // Re-query messages for the correct conversation
              const { data: correctMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', activeConvId)
                .order('created_at', { ascending: true })
              
              if (correctMessages) {
                // Process these messages instead
                const senderIds = Array.from(new Set(correctMessages.map(m => m.sender_id)))
                const { data: userProfiles } = senderIds.length > 0 ? await supabase
                  .from('user_profiles')
                  .select('id, full_name, role')
                  .in('id', senderIds) : { data: [] }

                const profilesById: Record<string, any> = {}
                userProfiles?.forEach(p => {
                  profilesById[p.id] = p
                })

                const { data: expertProfile } = await supabase
                  .from('user_profiles')
                  .select('id, full_name, role')
                  .eq('id', application.assigned_expert_id)
                  .maybeSingle()

                if (expertProfile) {
                  profilesById[application.assigned_expert_id] = expertProfile
                }

                const messagesWithSenders = correctMessages.map(msg => ({
                  ...msg,
                  sender: {
                    id: msg.sender_id,
                    user_profiles: profilesById[msg.sender_id] || null
                  },
                  is_own: msg.sender_id === currentUserId
                }))

                console.log('Setting messages from fallback:', messagesWithSenders.length)
                setMessages(messagesWithSenders)
                setIsLoadingConversation(false)
                return
              }
            }
          }
        }

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          setMessages([])
        } else if (!messagesData || messagesData.length === 0) {
          console.log('No messages found for conversation:', convId)
          setMessages([])
        } else {
          console.log('Processing', messagesData.length, 'messages')
          // Get sender profiles
          const senderIds = Array.from(new Set(messagesData.map(m => m.sender_id)))
          console.log('Sender IDs:', senderIds)
          
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

          // Get expert profile if needed
          const { data: expertProfile } = await supabase
            .from('user_profiles')
            .select('id, full_name, role')
            .eq('id', application.assigned_expert_id)
            .maybeSingle()

          if (expertProfile) {
            profilesById[application.assigned_expert_id] = expertProfile
          }

          const messagesWithSenders = messagesData.map(msg => ({
            ...msg,
            sender: {
              id: msg.sender_id,
              user_profiles: profilesById[msg.sender_id] || null
            },
            is_own: msg.sender_id === currentUserId
          }))

          console.log('Setting messages:', messagesWithSenders.length, 'messages')
          setMessages(messagesWithSenders)

          // Mark messages as read
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', convId)
            .neq('sender_id', currentUserId)
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
  }, [application.id, application.assigned_expert_id, application.company_owner_id, currentUserId, supabase])

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

          // Mark as read if not sent by current user
          if (newMessage.sender_id !== currentUserId && !newMessage.is_read) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
          }

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageContent.trim() || isSendingMessage || !currentUserId || !application.assigned_expert_id) return

    setIsSendingMessage(true)
    try {
      let convId = conversationId

      // If no conversation exists, create one
      console.log("convId: ",convId)
      if (!convId) {
        // Get client_id if not already set
        let client_id_val = clientId
        if (!client_id_val) {
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('company_owner_id', application.company_owner_id)
            .maybeSingle()

          if (clientError) {
            console.error('Error fetching client:', clientError)
            throw new Error('Error accessing client information. Please try again.')
          }

          if (!client) {
            // Client record doesn't exist - this is required for messaging
            console.error('Client record not found for company_owner_id:', application.company_owner_id)
            throw new Error('Your client account is not set up. Please contact support to complete your account setup before sending messages.')
          }

          client_id_val = client.id
          setClientId(client_id_val)
        }

        // First, try to find existing conversation (company owners can access conversations)
        // This avoids needing to query licensing_experts which company owners can't access
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id, expert_id')
          .eq('client_id', client_id_val)
          .is('admin_id', null)
          .maybeSingle()

        console.log("existingConv: ",existingConv)

        let expert_id_val = expertRecordId

        if (existingConv) {
          // Use existing conversation
          convId = existingConv.id
          expert_id_val = existingConv.expert_id
          if (expert_id_val && !expertRecordId) {
            setExpertRecordId(expert_id_val)
          }
        } else {
          // No existing conversation, need to get expert_id to create one
          // For company owners, we can't query licensing_experts due to RLS
          // But we can try to find expert_id from conversations that might exist
          // OR we need to get it from the client record's expert_id (which is user_id, not licensing_experts.id)
          
          // Try to get expert record (this will fail for company owners due to RLS, but try anyway)
          if (!expert_id_val) {
            const { data: expertRecord, error: expertError } = await supabase
              .from('licensing_experts')
              .select('id, first_name, last_name')
              .eq('user_id', application.assigned_expert_id)
              .maybeSingle()
            console.log("expertRecord: ",expertRecord, "expertError: ", expertError)

            if (expertError) {
              console.error('Error fetching expert record (likely RLS):', expertError)
              // Company owners can't read licensing_experts, so we need a different approach
              // Check if there are any conversations with messages that we can use
              const { data: convsWithMessages } = await supabase
                .from('conversations')
                .select('id, expert_id')
                .eq('client_id', client_id_val)
                .is('admin_id', null)
                .limit(1)

              if (convsWithMessages && convsWithMessages.length > 0) {
                // Use this conversation
                convId = convsWithMessages[0].id
                expert_id_val = convsWithMessages[0].expert_id
                setConversationId(convId)
                if (expert_id_val) {
                  setExpertRecordId(expert_id_val)
                }
              } else {
                throw new Error('Unable to access expert information. Please contact support or wait for the expert to send the first message.')
              }
            } else if (expertRecord) {
              expert_id_val = expertRecord.id
              setExpertRecordId(expert_id_val)
              setAssignedExpert({
                id: expertRecord.id,
                user_id: application.assigned_expert_id,
                first_name: expertRecord.first_name,
                last_name: expertRecord.last_name
              })
            } else {
              throw new Error('Expert record not found. Please contact support.')
            }
          }

          // Only create conversation if we don't have one yet
          if (!convId && expert_id_val) {
            // Create new conversation
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({
                client_id: client_id_val,
                expert_id: expert_id_val,
                admin_id: null
              })
              .select()
              .single()

            if (convError) {
              throw new Error('Failed to create conversation. Please try again.')
            }
            convId = newConv.id
          }
        }

        setConversationId(convId)
      }

      // Get current user profile for optimistic update
      const { data: currentUserProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('id', currentUserId)
        .single()

      // Send message
      console.log("convId: ",convId)
      console.log("currentUserId: ",currentUserId)
      console.log("messageContent: ",messageContent)
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
    if (assignedExpert) {
      return `${assignedExpert.first_name} ${assignedExpert.last_name}`
    }
    return 'Expert'
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
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
                <p className="text-gray-600">Here&apos;s your licensing progress for {application.state}</p>
              </div>

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
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleTabChange('ai-assistant')}
                      className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <CheckSquare className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Ask AI Assistant</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <Download className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Export Progress Report</span>
                    </button>
                  </div>
                </div>

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
                    ) : !application.assigned_expert_id ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No expert assigned to this application</p>
                        <p className="text-xs mt-1">Please wait for an expert to be assigned</p>
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
                          
                          return (
                            <div
                              key={message.id}
                              className="flex items-start gap-3"
                            >
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                                {initials}
                              </div>
                              
                              {/* Message Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
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
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
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
                        disabled={!messageContent.trim() || isSendingMessage || !application.assigned_expert_id}
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
