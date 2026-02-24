'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/query'

type MessageWithSender = {
  id: string
  content: string
  created_at: string
  sender_id: string
  is_own: boolean
  sender?: { id: string; user_profiles: { full_name?: string | null; role?: string | null } | null }
}

export function useAdminApplicationMessages(
  applicationId: string,
  companyOwnerId: string,
  adminUserId: string,
  fromNotification: boolean
) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!applicationId || !adminUserId) return

    const setupConversation = async () => {
      setIsLoadingConversation(true)
      try {
        let convId = conversationId

        if (!convId) {
          const { data: existingConv } = await q.getConversationByApplicationId(supabase, applicationId)

          if (existingConv) {
            convId = existingConv.id
            setConversationId(convId)
          } else {
            const { data: clientRow, error: clientErr } = await q.getClientByCompanyOwnerId(
              supabase,
              companyOwnerId
            )

            if (clientErr || !clientRow?.id) {
              console.error('Error resolving client for conversation:', clientErr || 'No client record')
              setIsLoadingConversation(false)
              return
            }

            const { data: newConv, error: convError } = await q.insertConversation(supabase, {
              client_id: clientRow.id,
              application_id: applicationId
            })

            if (convError) {
              if (convError.code === '23505') {
                const { data: existing } = await q.getConversationByApplicationId(supabase, applicationId)
                if (existing?.id) {
                  convId = existing.id
                  setConversationId(convId)
                } else {
                  console.error('Error creating conversation:', convError)
                  setIsLoadingConversation(false)
                  return
                }
              } else {
                console.error('Error creating conversation:', convError)
                setIsLoadingConversation(false)
                return
              }
            } else {
              convId = newConv!.id
              setConversationId(convId)
            }
          }
        }

        if (!convId) {
          setMessages([])
          setIsLoadingConversation(false)
          return
        }

        const { data: messagesData, error: messagesError } = await q.getMessagesByConversationId(supabase, convId)

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          setMessages([])
        } else {
          const senderIds = Array.from(new Set((messagesData || []).map((m) => m.sender_id)))
          const { data: userProfiles } =
            senderIds.length > 0 ? await q.getUserProfilesByIds(supabase, senderIds) : { data: [] }

          type ProfileRow = { id: string; full_name?: string | null; role?: string | null }
          const profilesList = (userProfiles ?? []) as unknown as ProfileRow[]
          const profilesById: Record<string, ProfileRow> = {}
          profilesList.forEach((p) => {
            profilesById[p.id] = p
          })

          const messagesWithSenders = (messagesData || []).map((msg) => ({
            ...msg,
            sender: {
              id: msg.sender_id,
              user_profiles: profilesById[msg.sender_id] || null
            },
            is_own: msg.sender_id === adminUserId
          }))

          setMessages(messagesWithSenders)

          const unreadIds = messagesWithSenders
            .filter(
              (msg) =>
                msg.sender_id !== adminUserId &&
                (!msg.is_read || !Array.isArray(msg.is_read) || !msg.is_read.includes(adminUserId))
            )
            .map((msg) => msg.id)
          if (unreadIds.length > 0) {
            await q.rpcMarkMessagesAsReadByUser(supabase, unreadIds, adminUserId)
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
  }, [applicationId, companyOwnerId, adminUserId, supabase, conversationId])

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
        async (payload: { new: { id: string; sender_id: string; created_at: string; content: string } }) => {
          const newMessage = payload.new
          const { data: profiles } = await q.getUserProfilesByIds(supabase, [newMessage.sender_id])
          const userProfile = profiles?.[0] as { full_name?: string | null; role?: string | null } | undefined

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender: {
              id: newMessage.sender_id,
              user_profiles: userProfile ?? null
            },
            is_own: newMessage.sender_id === adminUserId
          }

          setMessages((prevMessages) => {
            const exists = prevMessages.some((m) => m.id === newMessage.id)
            if (exists) return prevMessages
            const updated = [...prevMessages, messageWithSender]
            return updated.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })

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

  useEffect(() => {
    if (messages.length > 0) {
      const delay = fromNotification ? 500 : 0
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: fromNotification ? 'auto' : 'smooth'
        })
      }, delay)
    }
  }, [messages, fromNotification])

  const handleSendMessage = async () => {
    if (!messageContent.trim() || isSendingMessage || !conversationId || !adminUserId) return

    setIsSendingMessage(true)
    try {
      const { data: profiles } = await q.getUserProfilesByIds(supabase, [adminUserId])
      const currentUserProfile = profiles?.[0]

      const { data: newMessage, error: messageError } = await q.insertMessage(supabase, {
        conversation_id: conversationId,
        sender_id: adminUserId,
        content: messageContent.trim()
      })

      if (messageError) throw messageError

      await q.updateConversationLastMessageAt(supabase, conversationId)

      if (newMessage) {
        const optimisticMessage = {
          ...newMessage,
          is_read: Array.isArray(newMessage.is_read) ? newMessage.is_read : [adminUserId],
          sender: {
            id: adminUserId,
            user_profiles: currentUserProfile || null
          },
          is_own: true
        }
        setMessages((prev) => [...prev, optimisticMessage])
      }

      setMessageContent('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.message || 'Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  function formatMessageTime(dateString: string): string {
    const date = new Date(dateString)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${month} ${day}, ${time}`
  }

  function getSenderName(message: MessageWithSender): string {
    if (message.is_own) return 'Admin'
    if (message.sender?.user_profiles?.full_name) return message.sender.user_profiles.full_name
    return 'Client'
  }

  function getSenderRole(message: MessageWithSender): string {
    if (message.is_own) return 'Admin'
    if (message.sender?.user_profiles?.role === 'expert') return 'Expert'
    if (message.sender?.user_profiles?.role === 'admin') return 'Admin'
    return 'Owner'
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  function getAvatarColor(name: string): string {
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

  function getRoleTagColor(role: string): string {
    if (role === 'Expert') return 'bg-purple-100 text-purple-700 border-purple-200'
    if (role === 'Admin') return 'bg-green-100 text-green-700 border-green-200'
    if (role === 'Owner') return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return {
    messages,
    messageContent,
    setMessageContent,
    isLoadingConversation,
    isSendingMessage,
    conversationId,
    handleSendMessage,
    messagesEndRef,
    formatMessageTime,
    getSenderName,
    getSenderRole,
    getInitials,
    getAvatarColor,
    getRoleTagColor
  }
}
