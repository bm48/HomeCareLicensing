'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExpertDashboardLayout from '@/components/ExpertDashboardLayout'
import { 
  MessageSquare, 
  Search, 
  Send,
  Users,
  Mail,
  Clock
} from 'lucide-react'

interface Client {
  id: string
  company_name: string
  contact_email: string
  contact_name: string
}

interface Conversation {
  id: string
  client_id: string
  last_message_at: string
  client?: Client
  unread_count?: number
}

interface Message {
  id: string
  conversation_id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

export default function ExpertMessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'send'>('new')

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      
      // Get user session
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      // Get profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (profileData?.role !== 'expert') {
        router.push('/dashboard')
        return
      }
      setProfile(profileData)

      // Get expert record
      const { data: expertRecord } = await supabase
        .from('licensing_experts')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (!expertRecord) {
        setLoading(false)
        setUser(currentUser)
        setProfile(profileData)
        return
      }

      // Get assigned clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('expert_id', currentUser.id)
        .order('company_name', { ascending: true })
      
      setClients(clientsData || [])

      // Get conversations
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('expert_id', expertRecord.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      // Get unread message counts for each conversation
      const conversationsWithUnread = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id)
          
          return {
            ...conv,
            unread_count: count || 0
          }
        })
      )

      setConversations(conversationsWithUnread)

      // Get all messages for unread count
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', (conversationsData || []).map(c => c.id))
      
      const unreadMessages = allMessages?.filter(m => 
        !m.is_read && m.sender_id !== currentUser.id
      ) || []

      setMessages(unreadMessages)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [selectedConversation])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation || !user) return

    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        async (payload) => {
          // Get the new message
          const newMessage = payload.new as Message
          
          // Add new message to existing messages (avoid duplicates)
          setMessages(prevMessages => {
            // Check if message already exists (avoid duplicates)
            const exists = prevMessages.some(m => m.id === newMessage.id)
            if (exists) return prevMessages
            
            // Add new message and sort by created_at
            const updated = [...prevMessages, newMessage]
            return updated.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })

          // Mark as read if not sent by current user
          if (newMessage.sender_id !== user.id && !newMessage.is_read) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation, user])

  const loadMessages = async (conversationId: string) => {
    try {
      const supabase = createClient()
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedClient || sending) return

    try {
      setSending(true)
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Get expert record
      const { data: expertRecord } = await supabase
        .from('licensing_experts')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()


      if (!expertRecord) return

      // Find or create conversation
      let conversationId: string | null = null
      
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', selectedClient)
        .eq('expert_id', expertRecord.id)
        .is('admin_id', null)
        .maybeSingle()

        console.log("existingConv: ",existingConv)
      if (existingConv) {
        conversationId = existingConv.id
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: selectedClient,
            expert_id: expertRecord.id,
            admin_id: null
          })
          .select()
          .single()
        
        if (convError) throw convError
        conversationId = newConv.id
      }

      // Send message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: messageContent.trim()
        })

      if (messageError) throw messageError

      // Clear message
      setMessageContent('')
      
      // Add the new message to the list immediately (optimistic update)
      const newMessage: Message = {
        id: '', // Will be set by real-time subscription
        conversation_id: conversationId!,
        sender_id: currentUser.id,
        content: messageContent.trim(),
        is_read: true,
        created_at: new Date().toISOString()
      }
      
      // Update messages optimistically
      setMessages(prev => [...prev, newMessage])
      
      // Update conversation list if needed
      if (conversationId && !selectedConversation) {
        setSelectedConversation(conversationId)
        await loadMessages(conversationId)
      } else if (conversationId) {
        // Just reload messages to get the actual message with ID
        await loadMessages(conversationId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <ExpertDashboardLayout user={user} profile={profile}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ExpertDashboardLayout>
    )
  }

  const totalMessages = messages.length
  const unreadMessages = messages.filter(m => !m.is_read).length
  const activeConversations = conversations.length

  return (
    <ExpertDashboardLayout user={user} profile={profile}>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Communicate with your assigned clients
          </p>
        </div>

        {/* Message Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{totalMessages}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Messages</div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{unreadMessages}</div>
            <div className="text-xs sm:text-sm text-gray-600">Unread</div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{activeConversations}</div>
            <div className="text-xs sm:text-sm text-gray-600">Active Conversations</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Messages */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Recent Messages</h2>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Messages List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id)
                      setSelectedClient(conv.client_id)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conv.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">
                        {conv.client?.company_name || 'Unknown Client'}
                      </div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDate(conv.last_message_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Send Message */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'new'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  New Message
                </div>
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'send'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Send Message
              </button>
            </div>

            {/* Message Area */}
            <div className="space-y-4">
              {!selectedClient ? (
                <>
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Select a client to send a message</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Your Clients:</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {clients.length > 0 ? (
                        clients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => setSelectedClient(client.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedClient === client.id
                                ? 'bg-gray-100 border-2 border-gray-300'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-600" />
                              <span className="font-medium text-gray-900">{client.company_name}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No clients assigned
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Selected Client Info */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {clients.find(c => c.id === selectedClient)?.company_name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedClient(null)
                          setSelectedConversation(null)
                          setMessages([])
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Messages Display */}
                  {selectedConversation && messages.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-3">
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className="text-sm">{msg.content}</div>
                              <div className={`text-xs mt-1 ${
                                isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatTime(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="space-y-2">
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
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || sending}
                      className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ExpertDashboardLayout>
  )
}

