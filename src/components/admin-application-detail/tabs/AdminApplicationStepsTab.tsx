'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import type { ApplicationStep } from '../types'

interface AdminApplicationStepsTabProps {
  steps: ApplicationStep[]
  isLoadingSteps: boolean
  totalSteps: number
  onCompleteStep: (isCompleted: boolean, stepId: string) => void
}

export default function AdminApplicationStepsTab({
  steps,
  isLoadingSteps,
  totalSteps,
  onCompleteStep
}: AdminApplicationStepsTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
          {steps.map((step) => {
            const isCompleted = step.is_completed
            return (
              <div
                key={step.id}
                onClick={() => {
                  if (!isCompleted) {
                    onCompleteStep(true, step.id)
                  } else {
                    onCompleteStep(false, step.id)
                  }
                }}
                className={`flex items-start gap-3 p-4 border rounded-lg transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-200 cursor-pointer'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                <div className="mt-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 rounded-full border-gray-300" />
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
            )
          })}
        </div>
      )}
    </div>
  )
}
