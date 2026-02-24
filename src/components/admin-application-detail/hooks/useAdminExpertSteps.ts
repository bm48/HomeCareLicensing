'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/query'
import { copyExpertStepsFromRequirementToApplication } from '@/app/actions/license-requirements'
import type { Application, ApplicationStep } from '../types'

export function useAdminExpertSteps(application: Application | null, activeTab: string) {
  const [expertSteps, setExpertSteps] = useState<ApplicationStep[]>([])
  const [isLoadingExpertSteps, setIsLoadingExpertSteps] = useState(false)
  const [selectedExpertStepIds, setSelectedExpertStepIds] = useState<Set<string>>(new Set())
  const [isCopyingExpertSteps, setIsCopyingExpertSteps] = useState(false)
  const [showCopyExpertStepsModal, setShowCopyExpertStepsModal] = useState(false)
  const [availableApplications, setAvailableApplications] = useState<
    Array<{ id: string; application_name: string; state: string }>
  >([])
  const [selectedTargetApplicationId, setSelectedTargetApplicationId] = useState<string>('')
  const [isLoadingApplications, setIsLoadingApplications] = useState(false)
  const [showAddExpertStepModal, setShowAddExpertStepModal] = useState(false)
  const [expertStepFormData, setExpertStepFormData] = useState({
    stepName: '',
    description: '',
    phase: 'Pre-Application'
  })
  const [isSubmittingExpertStep, setIsSubmittingExpertStep] = useState(false)
  const supabase = createClient()

  const fetchExpertSteps = useCallback(async () => {
    if (!application?.id) return

    setIsLoadingExpertSteps(true)
    try {
      const { data: expertStepsData, error } = await q.getExpertApplicationStepsByApplicationId(
        supabase,
        application.id
      )

      if (error) {
        console.error('Error fetching expert steps:', error)
        setExpertSteps([])
        return
      }

      const steps = expertStepsData || []
      if (steps.length === 0 && application.license_type_id && application.state) {
        const { data: licenseType } = await q.getLicenseTypeById(supabase, application.license_type_id)
        if (licenseType?.name) {
          await copyExpertStepsFromRequirementToApplication(
            application.id,
            application.state,
            licenseType.name
          )
          const { data: refetched, error: refetchErr } = await q.getExpertApplicationStepsByApplicationId(
            supabase,
            application.id
          )
          if (!refetchErr && refetched?.length) {
            setExpertSteps(
              refetched.map((step: any) => ({
                id: step.id,
                step_name: step.step_name,
                step_order: step.step_order,
                description: step.description,
                is_completed: step.is_completed,
                is_expert_step: true,
                created_by_expert_id: step.created_by_expert_id
              }))
            )
            return
          }
        }
      }

      setExpertSteps(
        steps.map((step: any) => ({
          id: step.id,
          step_name: step.step_name,
          step_order: step.step_order,
          description: step.description,
          is_completed: step.is_completed,
          is_expert_step: true,
          created_by_expert_id: step.created_by_expert_id
        }))
      )
    } catch (error) {
      console.error('Error fetching expert steps:', error)
      setExpertSteps([])
    } finally {
      setIsLoadingExpertSteps(false)
    }
  }, [application?.id, application?.license_type_id, application?.state, supabase])

  useEffect(() => {
    if (activeTab === 'expert-process') {
      fetchExpertSteps()
    }
  }, [activeTab, fetchExpertSteps])

  const openAddExpertStepModal = useCallback(() => {
    setShowAddExpertStepModal(true)
    setExpertStepFormData({ stepName: '', description: '', phase: 'Pre-Application' })
  }, [])

  const closeAddExpertStepModal = useCallback(() => {
    setShowAddExpertStepModal(false)
    setExpertStepFormData({ stepName: '', description: '', phase: 'Pre-Application' })
  }, [])

  const handleAddExpertStep = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!application?.id || !expertStepFormData.stepName.trim() || isSubmittingExpertStep) return
      setIsSubmittingExpertStep(true)
      try {
        const { data: existingStepsData } = await q.getMaxExpertStepOrderForApplication(
          supabase,
          application.id
        )
        const nextOrder = existingStepsData?.length ? existingStepsData[0].step_order + 1 : 1
        const { error } = await q.insertApplicationStepRow(supabase, {
          application_id: application.id,
          step_name: expertStepFormData.stepName.trim(),
          step_order: nextOrder,
          description: expertStepFormData.description.trim() || null,
          phase: expertStepFormData.phase || null,
          is_expert_step: true,
          is_completed: false
        })
        if (error) throw error
        closeAddExpertStepModal()
        await fetchExpertSteps()
      } catch (err) {
        console.error('Error adding expert step:', err)
        alert('Failed to add expert step')
      } finally {
        setIsSubmittingExpertStep(false)
      }
    },
    [
      application?.id,
      expertStepFormData,
      isSubmittingExpertStep,
      supabase,
      closeAddExpertStepModal,
      fetchExpertSteps
    ]
  )

  const handleCopyExpertSteps = useCallback(
    async (targetApplicationId: string) => {
      if (selectedExpertStepIds.size === 0 || !targetApplicationId || isCopyingExpertSteps) return

      setIsCopyingExpertSteps(true)
      try {
        const stepsToCopy = expertSteps.filter((step) => selectedExpertStepIds.has(step.id))

        if (stepsToCopy.length === 0) {
          alert('Please select at least one expert step to copy')
          setIsCopyingExpertSteps(false)
          return
        }

        const { data: existingStepsData } = await q.getMaxExpertStepOrderForApplication(
          supabase,
          targetApplicationId
        )
        let nextOrder = existingStepsData?.length ? existingStepsData[0].step_order + 1 : 1

        const stepsToInsert = stepsToCopy.map((step) => ({
          application_id: targetApplicationId,
          step_name: step.step_name,
          step_order: nextOrder++,
          description: step.description,
          is_expert_step: true,
          is_completed: false,
          created_by_expert_id: step.created_by_expert_id
        }))

        const { error: insertError } = await q.insertApplicationStepsRows(supabase, stepsToInsert)

        if (insertError) throw insertError

        alert(`Successfully copied ${stepsToCopy.length} expert step(s)`)
        setSelectedExpertStepIds(new Set())
      } catch (error: any) {
        console.error('Error copying expert steps:', error)
        alert('Failed to copy expert steps: ' + (error.message || 'Unknown error'))
      } finally {
        setIsCopyingExpertSteps(false)
      }
    },
    [selectedExpertStepIds, expertSteps, isCopyingExpertSteps, supabase]
  )

  const toggleExpertStepSelection = useCallback((stepId: string) => {
    setSelectedExpertStepIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }, [])

  return {
    expertSteps,
    isLoadingExpertSteps,
    selectedExpertStepIds,
    setSelectedExpertStepIds,
    showCopyExpertStepsModal,
    setShowCopyExpertStepsModal,
    availableApplications,
    setAvailableApplications,
    selectedTargetApplicationId,
    setSelectedTargetApplicationId,
    isLoadingApplications,
    setIsLoadingApplications,
    showAddExpertStepModal,
    closeAddExpertStepModal,
    expertStepFormData,
    setExpertStepFormData,
    isSubmittingExpertStep,
    openAddExpertStepModal,
    handleAddExpertStep,
    handleCopyExpertSteps,
    toggleExpertStepSelection,
    isCopyingExpertSteps
  }
}
