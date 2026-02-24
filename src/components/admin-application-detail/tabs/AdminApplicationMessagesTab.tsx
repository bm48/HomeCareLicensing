'use client'

import { Send, Loader2 } from 'lucide-react'

interface AdminApplicationMessagesTabProps {
  messages: any[]
  messageContent: string
  setMessageContent: (v: string) => void
  isLoadingConversation: boolean
  isSendingMessage: boolean
  conversationId: string | null
  onSendMessage: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  formatMessageTime: (dateString: string) => string
  getSenderName: (message: any) => string
  getSenderRole: (message: any) => string
  getInitials: (name: string) => string
  getAvatarColor: (name: string) => string
  getRoleTagColor: (role: string) => string
}

export default function AdminApplicationMessagesTab({
  messages,
  messageContent,
  setMessageContent,
  isLoadingConversation,
  isSendingMessage,
  conversationId,
  onSendMessage,
  messagesEndRef,
  formatMessageTime,
  getSenderName,
  getSenderRole,
  getInitials,
  getAvatarColor,
  getRoleTagColor
}: AdminApplicationMessagesTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Application Messages</h2>
        <p className="text-sm text-gray-600">Communicate with your team about this application</p>
      </div>
      <div className="p-6">
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
                const avatarColor = getAvatarColor(senderName)
                const isOwnMessage = message.is_own

                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                    >
                      {initials}
                    </div>
                    <div
                      className={`flex-1 min-w-0 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}
                    >
                      <div
                        className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        <span className="text-sm font-semibold text-gray-900">{senderName}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${roleTagColor}`}
                        >
                          {senderRole}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white'
                        }`}
                      >
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            isOwnMessage ? 'text-white' : 'text-gray-900'
                          }`}
                        >
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

        <div className="border-t border-gray-200 pt-4">
          <div className="flex gap-3">
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onSendMessage()
                }
              }}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={onSendMessage}
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
          <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
