'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/query'
import type { Application, ApplicationStep } from '../types'

export function useAdminApplicationSteps(application: Application | null) {
  const [steps, setSteps] = useState<ApplicationStep[]>([])
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [isCompletingStep, setIsCompletingStep] = useState(false)
  const supabase = createClient()

  const fetchSteps = useCallback(async () => {
    if (!application) return

    setIsLoadingSteps(true)
    try {
      const { data: applicationSteps, error: appStepsError } = await q.getApplicationStepsByApplicationId(
        supabase,
        application.id
      )

      if (appStepsError) {
        console.error('Error fetching application steps:', appStepsError)
      }

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

        setSteps(regularSteps)
        setIsLoadingSteps(false)
        return
      }

      if (application.license_type_id) {
        const { data: licenseType, error: licenseTypeError } = await q.getLicenseTypeById(
          supabase,
          application.license_type_id
        )

        if (licenseTypeError || !licenseType || !licenseType.name) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        const requirementState = licenseType.state ?? application.state
        if (!requirementState) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        const { data: licenseRequirement, error: reqError } = await q.getLicenseRequirementByStateAndType(
          supabase,
          requirementState,
          licenseType.name
        )

        if (reqError || !licenseRequirement) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        const { data: requiredSteps, error: stepsError } = await q.getRegularStepsFromRequirement(
          supabase,
          licenseRequirement.id
        )

        if (stepsError) {
          console.error('Error fetching required steps:', stepsError)
          setSteps([])
        } else {
          setSteps(
            (requiredSteps || []).map((step: any) => ({
              id: step.id,
              step_name: step.step_name,
              step_order: step.step_order,
              description: step.description,
              is_completed: false
            }))
          )
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

  const handleCompleteStep = useCallback(
    async (isCompleted: boolean, stepId: string) => {
      if (!stepId || !application?.id || isCompletingStep) return

      setIsCompletingStep(true)
      try {
        const selectedStep = steps.find((s) => s.id === stepId)
        if (!selectedStep) throw new Error('Step not found')

        const { data: existingAppStep } = await q.getApplicationStepByAppAndId(supabase, application.id, stepId)

        if (existingAppStep) {
          const { error: updateError } = await q.updateApplicationStepCompleteById(
            supabase,
            stepId,
            application.id,
            {
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null
            }
          )
          if (updateError) throw updateError
        } else {
          const { data: existingByName } = await q.getApplicationStepByAppNameOrder(
            supabase,
            application.id,
            selectedStep.step_name,
            selectedStep.step_order
          )

          if (existingByName) {
            const { error: updateError } = await q.updateApplicationStepCompleteById(
              supabase,
              existingByName.id,
              application.id,
              { is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
            )
            if (updateError) throw updateError
          } else {
            if (!isCompleted) return
            const { error: insertError } = await q.insertApplicationStepRow(supabase, {
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

        await fetchSteps()
      } catch (error: any) {
        console.error('Error completing step:', error)
        alert('Failed to complete step: ' + (error.message || 'Unknown error'))
      } finally {
        setIsCompletingStep(false)
      }
    },
    [application?.id, steps, isCompletingStep, supabase, fetchSteps]
  )

  const completedSteps = steps.filter((s) => s.is_completed).length
  const totalSteps = steps.length

  return {
    steps,
    isLoadingSteps,
    isCompletingStep,
    handleCompleteStep,
    completedSteps,
    totalSteps,
    fetchSteps
  }
}
