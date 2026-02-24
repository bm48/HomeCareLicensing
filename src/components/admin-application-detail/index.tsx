'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/query'
import { Copy, Loader2 } from 'lucide-react'
import Modal from '@/components/Modal'
import type { AdminApplicationDetailContentProps, TabType } from './types'
import AdminApplicationDetailHeader from './AdminApplicationDetailHeader'
import AdminApplicationStepsTab from './tabs/AdminApplicationStepsTab'
import AdminApplicationDocumentsTab from './tabs/AdminApplicationDocumentsTab'
import AdminApplicationMessagesTab from './tabs/AdminApplicationMessagesTab'
import AdminApplicationExpertProcessTab from './tabs/AdminApplicationExpertProcessTab'
import { useAdminApplicationSteps } from './hooks/useAdminApplicationSteps'
import { useAdminApplicationDocuments } from './hooks/useAdminApplicationDocuments'
import { useAdminApplicationMessages } from './hooks/useAdminApplicationMessages'
import { useAdminExpertSteps } from './hooks/useAdminExpertSteps'

const TABS: { id: TabType; label: string }[] = [
  { id: 'steps', label: 'Steps' },
  { id: 'documents', label: 'Documents' },
  { id: 'messages', label: 'Messages' },
  { id: 'expert-process', label: 'Expert Process' }
]

export default function AdminApplicationDetailContent({
  application,
  documents: initialDocuments,
  adminUserId
}: AdminApplicationDetailContentProps) {
  const searchParams = useSearchParams()
  const fromNotification = searchParams?.get('fromNotification') === 'true'
  const [activeTab, setActiveTab] = useState<TabType>('steps')
  const supabase = createClient()

  const stepsState = useAdminApplicationSteps(application)
  const documentsState = useAdminApplicationDocuments(
    application,
    initialDocuments,
    activeTab
  )
  const messagesState = useAdminApplicationMessages(
    application.id,
    application.company_owner_id,
    adminUserId,
    fromNotification
  )
  const expertStepsState = useAdminExpertSteps(application, activeTab)

  const openCopyExpertStepsModal = useCallback(async () => {
    expertStepsState.setIsLoadingApplications(true)
    expertStepsState.setShowCopyExpertStepsModal(true)
    const { data: allApplications } = await q.getApplicationsListForDropdown(supabase, application.id)
    if (allApplications) {
      expertStepsState.setAvailableApplications(allApplications)
    }
    expertStepsState.setIsLoadingApplications(false)
  }, [application.id, supabase, expertStepsState])

  return (
    <div className="space-y-6">
      <AdminApplicationDetailHeader
        application={application}
        completedSteps={stepsState.completedSteps}
        totalSteps={stepsState.totalSteps}
        completedDocuments={documentsState.completedDocuments}
        totalDocuments={documentsState.totalDocuments}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 -mt-2">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {activeTab === 'steps' && (
        <AdminApplicationStepsTab
          steps={stepsState.steps}
          isLoadingSteps={stepsState.isLoadingSteps}
          totalSteps={stepsState.totalSteps}
          onCompleteStep={stepsState.handleCompleteStep}
        />
      )}

      {activeTab === 'documents' && (
        <AdminApplicationDocumentsTab
          documents={documentsState.documents}
          requirementDocuments={documentsState.requirementDocuments}
          isLoadingRequirementDocuments={documentsState.isLoadingRequirementDocuments}
          useTemplateForDocuments={documentsState.useTemplateForDocuments}
          getLinkedDocument={documentsState.getLinkedDocument}
          onDownload={documentsState.handleDownload}
        />
      )}

      {activeTab === 'messages' && (
        <AdminApplicationMessagesTab
          messages={messagesState.messages}
          messageContent={messagesState.messageContent}
          setMessageContent={messagesState.setMessageContent}
          isLoadingConversation={messagesState.isLoadingConversation}
          isSendingMessage={messagesState.isSendingMessage}
          conversationId={messagesState.conversationId}
          onSendMessage={messagesState.handleSendMessage}
          messagesEndRef={messagesState.messagesEndRef}
          formatMessageTime={messagesState.formatMessageTime}
          getSenderName={messagesState.getSenderName}
          getSenderRole={messagesState.getSenderRole}
          getInitials={messagesState.getInitials}
          getAvatarColor={messagesState.getAvatarColor}
          getRoleTagColor={messagesState.getRoleTagColor}
        />
      )}

      {activeTab === 'expert-process' && (
        <AdminApplicationExpertProcessTab
          expertSteps={expertStepsState.expertSteps}
          isLoadingExpertSteps={expertStepsState.isLoadingExpertSteps}
          selectedExpertStepIds={expertStepsState.selectedExpertStepIds}
          onToggleExpertStepSelection={expertStepsState.toggleExpertStepSelection}
          showAddExpertStepModal={expertStepsState.showAddExpertStepModal}
          onOpenAddExpertStepModal={expertStepsState.openAddExpertStepModal}
          onCloseAddExpertStepModal={expertStepsState.closeAddExpertStepModal}
          expertStepFormData={expertStepsState.expertStepFormData}
          onExpertStepFormDataChange={expertStepsState.setExpertStepFormData}
          isSubmittingExpertStep={expertStepsState.isSubmittingExpertStep}
          onAddExpertStep={expertStepsState.handleAddExpertStep}
          onOpenCopyModal={openCopyExpertStepsModal}
        />
      )}

      <Modal
        isOpen={expertStepsState.showCopyExpertStepsModal}
        onClose={() => {
          expertStepsState.setShowCopyExpertStepsModal(false)
          expertStepsState.setSelectedTargetApplicationId('')
        }}
        title="Copy Expert Steps to Another Application"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Target Application
            </label>
            {expertStepsState.isLoadingApplications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : expertStepsState.availableApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No other applications found</p>
              </div>
            ) : (
              <select
                value={expertStepsState.selectedTargetApplicationId}
                onChange={(e) =>
                  expertStepsState.setSelectedTargetApplicationId(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an application...</option>
                {expertStepsState.availableApplications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.application_name} ({app.state})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Selected Steps:</p>
            <p>{expertStepsState.selectedExpertStepIds.size} expert step(s) will be copied</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                expertStepsState.setShowCopyExpertStepsModal(false)
                expertStepsState.setSelectedTargetApplicationId('')
              }}
              className="px-6 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!expertStepsState.selectedTargetApplicationId) {
                  alert('Please select a target application')
                  return
                }
                await expertStepsState.handleCopyExpertSteps(
                  expertStepsState.selectedTargetApplicationId
                )
                expertStepsState.setShowCopyExpertStepsModal(false)
                expertStepsState.setSelectedTargetApplicationId('')
                expertStepsState.setSelectedExpertStepIds(new Set())
              }}
              disabled={
                expertStepsState.isCopyingExpertSteps ||
                !expertStepsState.selectedTargetApplicationId
              }
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {expertStepsState.isCopyingExpertSteps ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Steps
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
