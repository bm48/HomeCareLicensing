'use client'

import { Plus, Copy, CheckCircle2, Loader2 } from 'lucide-react'
import Modal from '@/components/Modal'
import type { ApplicationStep } from '../types'

interface AdminApplicationExpertProcessTabProps {
  expertSteps: ApplicationStep[]
  isLoadingExpertSteps: boolean
  selectedExpertStepIds: Set<string>
  onToggleExpertStepSelection: (stepId: string) => void
  showAddExpertStepModal: boolean
  onOpenAddExpertStepModal: () => void
  onCloseAddExpertStepModal: () => void
  expertStepFormData: { stepName: string; description: string; phase: string }
  onExpertStepFormDataChange: (data: { stepName: string; description: string; phase: string }) => void
  isSubmittingExpertStep: boolean
  onAddExpertStep: (e: React.FormEvent) => void
  onOpenCopyModal: () => void
}

export default function AdminApplicationExpertProcessTab({
  expertSteps,
  isLoadingExpertSteps,
  selectedExpertStepIds,
  onToggleExpertStepSelection,
  showAddExpertStepModal,
  onOpenAddExpertStepModal,
  onCloseAddExpertStepModal,
  expertStepFormData,
  onExpertStepFormDataChange,
  isSubmittingExpertStep,
  onAddExpertStep,
  onOpenCopyModal
}: AdminApplicationExpertProcessTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Expert Process Steps</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddExpertStepModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>
            {selectedExpertStepIds.size > 0 && (
              <button
                onClick={onOpenCopyModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Selected ({selectedExpertStepIds.size})
              </button>
            )}
          </div>
        </div>

        <Modal
          isOpen={showAddExpertStepModal}
          onClose={onCloseAddExpertStepModal}
          title="Add Expert Step"
          size="lg"
        >
          <form onSubmit={onAddExpertStep} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
              <select
                value={expertStepFormData.phase}
                onChange={(e) =>
                  onExpertStepFormDataChange({ ...expertStepFormData, phase: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Pre-Application">Pre-Application</option>
                <option value="Post-Application">Post-Application</option>
                <option value="Application">Application</option>
                <option value="Review">Review</option>
                <option value="Post-Approval">Post-Approval</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Title</label>
              <input
                type="text"
                value={expertStepFormData.stepName}
                onChange={(e) =>
                  onExpertStepFormDataChange({ ...expertStepFormData, stepName: e.target.value })
                }
                placeholder="e.g., Initial Client Consultation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={expertStepFormData.description}
                onChange={(e) =>
                  onExpertStepFormDataChange({ ...expertStepFormData, description: e.target.value })
                }
                placeholder="Detailed description of this step"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmittingExpertStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingExpertStep ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Save Step
              </button>
              <button
                type="button"
                onClick={onCloseAddExpertStepModal}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {isLoadingExpertSteps ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : expertSteps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No expert process steps found</p>
            <p className="text-xs mt-1">Expert steps added by the assigned expert will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expertSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-4 border rounded-lg ${
                  step.is_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={selectedExpertStepIds.has(step.id)}
                    onChange={() => onToggleExpertStepSelection(step.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
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
                <div className="mt-1">
                  {step.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
