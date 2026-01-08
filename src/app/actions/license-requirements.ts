'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateStepData {
  licenseRequirementId: string
  stepName: string
  description: string
  estimatedDays?: number
}

export interface CreateDocumentData {
  licenseRequirementId: string
  documentName: string
  description: string
  isRequired: boolean
}

export interface CreateExpertStepData {
  licenseRequirementId: string
  phase: string
  stepTitle: string
  description: string
}

// Get or create license requirement
async function getOrCreateLicenseRequirement(state: string, licenseTypeName: string) {
  const supabase = await createClient()

  // Try to get existing requirement
  const { data: existing } = await supabase
    .from('license_requirements')
    .select('id')
    .eq('state', state)
    .eq('license_type', licenseTypeName)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // Create new requirement if it doesn't exist
  const { data: newRequirement, error } = await supabase
    .from('license_requirements')
    .insert({
      state,
      license_type: licenseTypeName,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create license requirement: ${error.message}`)
  }

  return newRequirement.id
}

export async function createStep(data: CreateStepData) {
  const supabase = await createClient()

  // Get the highest step_order for regular steps (non-expert) in this requirement
  const { data: existingSteps } = await supabase
    .from('license_requirement_steps')
    .select('step_order')
    .eq('license_requirement_id', data.licenseRequirementId)
    .eq('is_expert_step', false)
    .order('step_order', { ascending: false })
    .limit(1)

  const nextOrder = existingSteps && existingSteps.length > 0 
    ? existingSteps[0].step_order + 1 
    : 1

  const { data: step, error } = await supabase
    .from('license_requirement_steps')
    .insert({
      license_requirement_id: data.licenseRequirementId,
      step_name: data.stepName,
      step_order: nextOrder,
      description: data.description || null,
      is_expert_step: false,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: step }
}

export async function createDocument(data: CreateDocumentData) {
  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('license_requirement_documents')
    .insert({
      license_requirement_id: data.licenseRequirementId,
      document_name: data.documentName,
      document_type: null, // Can be extended later
      description: data.description || null,
      is_required: data.isRequired,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: document }
}

export async function createExpertStep(data: CreateExpertStepData) {
  const supabase = await createClient()

  // Get the highest step_order for expert steps in this requirement
  const { data: existingSteps } = await supabase
    .from('license_requirement_steps')
    .select('step_order')
    .eq('license_requirement_id', data.licenseRequirementId)
    .eq('is_expert_step', true)
    .order('step_order', { ascending: false })
    .limit(1)

  const nextOrder = existingSteps && existingSteps.length > 0 
    ? existingSteps[0].step_order + 1 
    : 1

  // Store expert step with is_expert_step flag and phase
  const { data: step, error } = await supabase
    .from('license_requirement_steps')
    .insert({
      license_requirement_id: data.licenseRequirementId,
      step_name: data.stepTitle,
      step_order: nextOrder,
      description: data.description,
      is_expert_step: true,
      phase: data.phase,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: step }
}

// Update functions
export async function updateStep(id: string, data: { stepName: string; description: string; estimatedDays?: number }) {
  const supabase = await createClient()

  const { data: step, error } = await supabase
    .from('license_requirement_steps')
    .update({
      step_name: data.stepName,
      description: data.description || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: step }
}

export async function updateDocument(id: string, data: { documentName: string; description: string; isRequired: boolean }) {
  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('license_requirement_documents')
    .update({
      document_name: data.documentName,
      description: data.description || null,
      is_required: data.isRequired,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: document }
}

export async function updateExpertStep(id: string, data: { phase: string; stepTitle: string; description: string }) {
  const supabase = await createClient()

  const { data: step, error } = await supabase
    .from('license_requirement_steps')
    .update({
      step_name: data.stepTitle,
      description: data.description,
      phase: data.phase,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: step }
}

// Delete functions
export async function deleteStep(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('license_requirement_steps')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null }
}

export async function deleteDocument(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('license_requirement_documents')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null }
}

export async function deleteExpertStep(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('license_requirement_steps')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null }
}

export async function getLicenseRequirementId(state: string, licenseTypeName: string) {
  const supabase = await createClient()
  
  const requirementId = await getOrCreateLicenseRequirement(state, licenseTypeName)
  return { error: null, data: requirementId }
}
