'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateStepData {
  licenseRequirementId: string
  stepName: string
  description: string
  estimatedDays?: number
  isRequired: boolean
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
      estimated_days: data.estimatedDays ?? null,
      is_required: data.isRequired,
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

// Get application ids that match a license requirement (state + license_type)
async function getApplicationIdsForRequirement(supabase: Awaited<ReturnType<typeof createClient>>, licenseRequirementId: string): Promise<string[]> {
  const { data: lr, error: lrError } = await supabase
    .from('license_requirements')
    .select('state, license_type')
    .eq('id', licenseRequirementId)
    .maybeSingle()
  if (lrError || !lr) return []

  const { data: apps, error: appsError } = await supabase
    .from('applications')
    .select('id, license_type_id')
    .eq('state', lr.state)
  if (appsError || !apps?.length) return []

  // Filter to applications whose license_types.name matches license_requirement.license_type
  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('id')
    .eq('name', lr.license_type)
  const licenseTypeIds = new Set((licenseTypes || []).map((lt: { id: string }) => lt.id))
  const matching = (apps as { id: string; license_type_id?: string | null }[]).filter(
    (a) => a.license_type_id && licenseTypeIds.has(a.license_type_id)
  )
  return matching.map((a) => a.id)
}

export async function createExpertStep(data: CreateExpertStepData) {
  const supabase = await createClient()

  const applicationIds = await getApplicationIdsForRequirement(supabase, data.licenseRequirementId)
  if (applicationIds.length === 0) {
    return { error: 'No applications found for this license type and state', data: null }
  }

  const inserted: { id: string }[] = []
  for (const applicationId of applicationIds) {
    const { data: existingSteps } = await supabase
      .from('application_steps')
      .select('step_order')
      .eq('application_id', applicationId)
      .eq('is_expert_step', true)
      .order('step_order', { ascending: false })
      .limit(1)

    const nextOrder = existingSteps?.length ? (existingSteps[0].step_order + 1) : 1

    const { data: step, error } = await supabase
      .from('application_steps')
      .insert({
        application_id: applicationId,
        step_name: data.stepTitle,
        step_order: nextOrder,
        description: data.description || null,
        is_expert_step: true,
        phase: data.phase || null,
        is_completed: false,
      })
      .select('id')
      .single()

    if (error) {
      return { error: error.message, data: null }
    }
    if (step) inserted.push(step)
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: inserted[0] ?? null }
}

// Update functions
export async function updateStep(id: string, data: { stepName: string; description: string; estimatedDays?: number; isRequired: boolean }) {
  const supabase = await createClient()

  const { data: step, error } = await supabase
    .from('license_requirement_steps')
    .update({
      step_name: data.stepName,
      description: data.description || null,
      estimated_days: data.estimatedDays ?? null,
      is_required: data.isRequired,
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
    .from('application_steps')
    .update({
      step_name: data.stepTitle,
      description: data.description ?? null,
      phase: data.phase || null,
    })
    .eq('id', id)
    .eq('is_expert_step', true)
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: step }
}

// Update all application_steps rows that match this template step (for license requirement detail page)
export async function updateExpertStepForRequirement(
  requirementId: string,
  stepName: string,
  description: string | null,
  phase: string | null,
  data: { phase: string; stepTitle: string; description: string }
) {
  const supabase = await createClient()
  const applicationIds = await getApplicationIdsForRequirement(supabase, requirementId)
  if (applicationIds.length === 0) return { error: 'No applications found for this requirement', data: null }

  // Match by step_name, description, phase (null-safe)
  let query = supabase
    .from('application_steps')
    .update({
      step_name: data.stepTitle,
      description: data.description ?? null,
      phase: data.phase || null,
    })
    .eq('is_expert_step', true)
    .in('application_id', applicationIds)
    .eq('step_name', stepName)
  if (description != null) query = query.eq('description', description)
  else query = query.is('description', null)
  if (phase != null) query = query.eq('phase', phase)
  else query = query.is('phase', null)

  const { error } = await query
  if (error) return { error: error.message, data: null }
  revalidatePath('/admin/license-requirements')
  return { error: null, data: true }
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
    .from('application_steps')
    .delete()
    .eq('id', id)
    .eq('is_expert_step', true)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null }
}

// Delete all application_steps rows that match this template step (for license requirement detail page)
export async function deleteExpertStepForRequirement(
  requirementId: string,
  stepName: string,
  description: string | null,
  phase: string | null
) {
  const supabase = await createClient()
  const applicationIds = await getApplicationIdsForRequirement(supabase, requirementId)
  if (applicationIds.length === 0) return { error: null }

  let query = supabase
    .from('application_steps')
    .delete()
    .eq('is_expert_step', true)
    .in('application_id', applicationIds)
    .eq('step_name', stepName)
  if (description != null) query = query.eq('description', description)
  else query = query.is('description', null)
  if (phase != null) query = query.eq('phase', phase)
  else query = query.is('phase', null)

  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath('/admin/license-requirements')
  return { error: null }
}

export async function getLicenseRequirementId(state: string, licenseTypeName: string) {
  const supabase = await createClient()
  
  const requirementId = await getOrCreateLicenseRequirement(state, licenseTypeName)
  return { error: null, data: requirementId }
}

// Get all license requirements for copying
export async function getAllLicenseRequirements() {
  const supabase = await createClient()
  
  const { data: requirements, error } = await supabase
    .from('license_requirements')
    .select('id, state, license_type')
    .order('state', { ascending: true })
    .order('license_type', { ascending: true })
  
  if (error) {
    return { error: error.message, data: null }
  }
  
  return { error: null, data: requirements || [] }
}

// Get steps from a license requirement
export async function getStepsFromRequirement(requirementId: string) {
  const supabase = await createClient()
  
  const { data: steps, error } = await supabase
    .from('license_requirement_steps')
    .select('*')
    .eq('license_requirement_id', requirementId)
    .order('step_order', { ascending: true })
  
  if (error) {
    return { error: error.message, data: null }
  }
  
  return { error: null, data: steps || [] }
}

// Step with state and license_type for Browse All Steps
export type StepWithRequirementInfo = {
  id: string
  step_name: string
  step_order: number
  description: string | null
  estimated_days?: number | null
  is_required?: boolean
  license_requirement_id: string
  state: string
  license_type: string
}

// Get all steps across all license requirements with state and license_type (for Browse All Steps modal).
// Optionally exclude steps belonging to currentRequirementId so the current license's steps are not listed.
export async function getAllStepsWithRequirementInfo(currentRequirementId?: string | null): Promise<{ error: string | null; data: StepWithRequirementInfo[] | null }> {
  const supabase = await createClient()

  let query = supabase
    .from('license_requirement_steps')
    .select(`
      id,
      step_name,
      step_order,
      description,
      estimated_days,
      is_required,
      license_requirement_id,
      license_requirements!inner(state, license_type)
    `)
    .order('license_requirement_id')
    .order('step_order', { ascending: true })

  if (currentRequirementId) {
    query = query.neq('license_requirement_id', currentRequirementId)
  }

  const { data: rows, error } = await query

  if (error) {
    return { error: error.message, data: null }
  }

  const steps: StepWithRequirementInfo[] = (rows || []).map((row: Record<string, unknown>) => {
    const req = row.license_requirements as { state?: string; license_type?: string } | null
    return {
      id: row.id as string,
      step_name: row.step_name as string,
      step_order: row.step_order as number,
      description: (row.description as string | null) ?? null,
      estimated_days: (row.estimated_days as number | null) ?? null,
      is_required: (row.is_required as boolean) ?? true,
      license_requirement_id: row.license_requirement_id as string,
      state: req?.state ?? '',
      license_type: req?.license_type ?? '',
    }
  })

  return { error: null, data: steps }
}

// Document with state and license_type for Browse All Documents
export type DocumentWithRequirementInfo = {
  id: string
  document_name: string
  document_type: string | null
  description: string | null
  is_required: boolean
  license_requirement_id: string
  state: string
  license_type: string
}

export async function getAllDocumentsWithRequirementInfo(currentRequirementId?: string | null): Promise<{ error: string | null; data: DocumentWithRequirementInfo[] | null }> {
  const supabase = await createClient()

  let query = supabase
    .from('license_requirement_documents')
    .select(`
      id,
      document_name,
      document_type,
      description,
      is_required,
      license_requirement_id,
      license_requirements!inner(state, license_type)
    `)
    .order('license_requirement_id')
    .order('document_name', { ascending: true })

  if (currentRequirementId) {
    query = query.neq('license_requirement_id', currentRequirementId)
  }

  const { data: rows, error } = await query

  if (error) {
    return { error: error.message, data: null }
  }

  const documents: DocumentWithRequirementInfo[] = (rows || []).map((row: Record<string, unknown>) => {
    const req = row.license_requirements as { state?: string; license_type?: string } | null
    return {
      id: row.id as string,
      document_name: row.document_name as string,
      document_type: (row.document_type as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      is_required: (row.is_required as boolean) ?? true,
      license_requirement_id: row.license_requirement_id as string,
      state: req?.state ?? '',
      license_type: req?.license_type ?? '',
    }
  })

  return { error: null, data: documents }
}

// Get documents from a license requirement
export async function getDocumentsFromRequirement(requirementId: string) {
  const supabase = await createClient()
  
  const { data: documents, error } = await supabase
    .from('license_requirement_documents')
    .select('*')
    .eq('license_requirement_id', requirementId)
    .order('document_name', { ascending: true })
  
  if (error) {
    return { error: error.message, data: null }
  }
  
  return { error: null, data: documents || [] }
}

// Copy steps from one requirement to another
export async function copySteps(targetRequirementId: string, sourceStepIds: string[]) {
  const supabase = await createClient()
  
  if (sourceStepIds.length === 0) {
    return { error: 'No steps selected', data: null }
  }
  
  // Get source steps (license_requirement_steps has no is_expert_step column)
  const { data: sourceSteps, error: fetchError } = await supabase
    .from('license_requirement_steps')
    .select('*')
    .in('id', sourceStepIds)
  
  if (fetchError || !sourceSteps || sourceSteps.length === 0) {
    return { error: fetchError?.message || 'Failed to fetch source steps', data: null }
  }
  
  // Get the highest step_order in target requirement
  const { data: existingSteps } = await supabase
    .from('license_requirement_steps')
    .select('step_order')
    .eq('license_requirement_id', targetRequirementId)
    .order('step_order', { ascending: false })
    .limit(1)
  
  let nextOrder = existingSteps && existingSteps.length > 0 
    ? existingSteps[0].step_order + 1 
    : 1
  
  // Insert copied steps (omit is_expert_step - not on license_requirement_steps)
  const stepsToInsert = sourceSteps.map((step) => ({
    license_requirement_id: targetRequirementId,
    step_name: step.step_name,
    step_order: nextOrder++,
    description: step.description,
    estimated_days: step.estimated_days ?? null,
    is_required: step.is_required ?? true,
  }))
  
  const { data: copiedSteps, error: insertError } = await supabase
    .from('license_requirement_steps')
    .insert(stepsToInsert)
    .select()
  
  if (insertError) {
    return { error: insertError.message, data: null }
  }
  
  revalidatePath('/admin/license-requirements')
  return { error: null, data: copiedSteps }
}

// Copy documents from one requirement to another
export async function copyDocuments(targetRequirementId: string, sourceDocumentIds: string[]) {
  const supabase = await createClient()
  
  if (sourceDocumentIds.length === 0) {
    return { error: 'No documents selected', data: null }
  }
  
  // Get source documents
  const { data: sourceDocuments, error: fetchError } = await supabase
    .from('license_requirement_documents')
    .select('*')
    .in('id', sourceDocumentIds)
  
  if (fetchError || !sourceDocuments || sourceDocuments.length === 0) {
    return { error: fetchError?.message || 'Failed to fetch source documents', data: null }
  }
  
  // Insert copied documents
  const documentsToInsert = sourceDocuments.map((doc) => ({
    license_requirement_id: targetRequirementId,
    document_name: doc.document_name,
    document_type: doc.document_type,
    description: doc.description,
    is_required: doc.is_required,
  }))
  
  const { data: copiedDocuments, error: insertError } = await supabase
    .from('license_requirement_documents')
    .insert(documentsToInsert)
    .select()
  
  if (insertError) {
    return { error: insertError.message, data: null }
  }
  
  revalidatePath('/admin/license-requirements')
  return { error: null, data: copiedDocuments }
}

// Get expert steps for a license requirement: from application_steps for all applications of this requirement (deduplicated by step_name, description, phase)
export async function getExpertStepsFromRequirement(requirementId: string) {
  const supabase = await createClient()
  const applicationIds = await getApplicationIdsForRequirement(supabase, requirementId)
  if (applicationIds.length === 0) return { error: null, data: [] }

  const { data: rows, error } = await supabase
    .from('application_steps')
    .select('id, step_name, step_order, description, phase')
    .eq('is_expert_step', true)
    .in('application_id', applicationIds)
    .order('step_order', { ascending: true })

  if (error) return { error: error.message, data: null }

  // Deduplicate by (step_name, description, phase), keep first occurrence for id/step_order
  const seen = new Set<string>()
  const steps = (rows || []).filter((row: { step_name: string; description: string | null; phase: string | null }) => {
    const key = `${row.step_name}\n${row.description ?? ''}\n${row.phase ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { error: null, data: steps }
}

// Expert step with state and license_type for Browse All Expert Steps
export type ExpertStepWithRequirementInfo = {
  id: string
  step_name: string
  step_order: number
  description: string | null
  phase?: string | null
  license_requirement_id: string
  state: string
  license_type: string
}

export async function getAllExpertStepsWithRequirementInfo(currentRequirementId?: string | null): Promise<{ error: string | null; data: ExpertStepWithRequirementInfo[] | null }> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('application_steps')
    .select('id, step_name, step_order, description, phase, application_id')
    .eq('is_expert_step', true)
    .order('step_order', { ascending: true })

  if (error) {
    return { error: error.message, data: null }
  }

  if (!rows?.length) return { error: null, data: [] }

  const appIds = [...new Set((rows as { application_id: string }[]).map((r) => r.application_id))]
  const { data: apps } = await supabase
    .from('applications')
    .select('id, state, license_type_id')
    .in('id', appIds)
  const appMap = new Map<string, { state: string; license_type_id: string | null }>()
  for (const a of apps || []) {
    appMap.set((a as { id: string }).id, {
      state: (a as { state: string }).state,
      license_type_id: (a as { license_type_id: string | null }).license_type_id ?? null,
    })
  }
  const ltIds = [...new Set(Array.from(appMap.values()).map((a) => a.license_type_id).filter(Boolean) as string[])]
  const { data: lts } = await supabase.from('license_types').select('id, name').in('id', ltIds)
  const ltMap = new Map<string, string>()
  for (const lt of lts || []) {
    ltMap.set((lt as { id: string }).id, (lt as { name: string }).name)
  }
  const reqIdByStateType = new Map<string, string>()
  const steps: ExpertStepWithRequirementInfo[] = []
  const seen = new Set<string>()

  for (const row of rows as { id: string; step_name: string; step_order: number; description: string | null; phase: string | null; application_id: string }[]) {
    const app = appMap.get(row.application_id)
    if (!app?.license_type_id) continue
    const state = app.state
    const licenseTypeName = ltMap.get(app.license_type_id) ?? ''
    if (!licenseTypeName) continue
    const key = `${row.step_name}\n${row.description ?? ''}\n${row.phase ?? ''}\n${state}\n${licenseTypeName}`
    if (seen.has(key)) continue
    seen.add(key)
    let licenseRequirementId = reqIdByStateType.get(`${state}\n${licenseTypeName}`)
    if (licenseRequirementId == null) {
      const { data: lr } = await supabase
        .from('license_requirements')
        .select('id')
        .eq('state', state)
        .eq('license_type', licenseTypeName)
        .maybeSingle()
      licenseRequirementId = (lr as { id: string } | null)?.id ?? ''
      if (licenseRequirementId) reqIdByStateType.set(`${state}\n${licenseTypeName}`, licenseRequirementId)
    }
    if (currentRequirementId && licenseRequirementId === currentRequirementId) continue
    steps.push({
      id: row.id,
      step_name: row.step_name,
      step_order: row.step_order,
      description: row.description ?? null,
      phase: row.phase ?? null,
      license_requirement_id: licenseRequirementId,
      state,
      license_type: licenseTypeName,
    })
  }

  return { error: null, data: steps }
}

// Copy expert steps (from application_steps) to all applications of target requirement
export async function copyExpertSteps(targetRequirementId: string, sourceExpertStepIds: string[]) {
  const supabase = await createClient()

  if (sourceExpertStepIds.length === 0) {
    return { error: 'No expert steps selected', data: null }
  }

  const { data: sourceSteps, error: fetchError } = await supabase
    .from('application_steps')
    .select('step_name, description, phase')
    .in('id', sourceExpertStepIds)
    .eq('is_expert_step', true)

  if (fetchError || !sourceSteps || sourceSteps.length === 0) {
    return { error: fetchError?.message || 'Failed to fetch source expert steps', data: null }
  }

  const targetApplicationIds = await getApplicationIdsForRequirement(supabase, targetRequirementId)
  if (targetApplicationIds.length === 0) {
    return { error: 'No applications found for target license type and state', data: null }
  }

  const inserted: { id: string }[] = []
  for (const applicationId of targetApplicationIds) {
    const { data: existingSteps } = await supabase
      .from('application_steps')
      .select('step_order')
      .eq('application_id', applicationId)
      .eq('is_expert_step', true)
      .order('step_order', { ascending: false })
      .limit(1)
    let nextOrder = existingSteps?.length ? existingSteps[0].step_order + 1 : 1

    for (const step of sourceSteps as { step_name: string; description: string | null; phase: string | null }[]) {
      const { data: one, error: insertError } = await supabase
        .from('application_steps')
        .insert({
          application_id: applicationId,
          step_name: step.step_name,
          step_order: nextOrder++,
          description: step.description ?? null,
          phase: step.phase ?? null,
          is_expert_step: true,
          is_completed: false,
        })
        .select('id')
        .single()
      if (insertError) return { error: insertError.message, data: null }
      if (one) inserted.push(one)
    }
  }

  revalidatePath('/admin/license-requirements')
  return { error: null, data: inserted }
}