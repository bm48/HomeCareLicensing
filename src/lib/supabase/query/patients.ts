import type { Supabase } from '../types'

/** Insert a patient and return the result. */
export async function insertPatient(
  supabase: Supabase,
  data: Record<string, unknown>
) {
  return supabase.from('patients').insert(data)
}

/** Get patients by owner_id. */
export async function getPatientsByOwnerId(supabase: Supabase, ownerId: string) {
  return supabase
    .from('patients')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
}

/** Update patient status by id. */
export async function updatePatientStatus(
  supabase: Supabase,
  patientId: string,
  status: string
) {
  return supabase.from('patients').update({ status }).eq('id', patientId)
}

/** Get patient by id and owner_id (for detail page). */
export async function getPatientByIdAndOwnerId(
  supabase: Supabase,
  patientId: string,
  ownerId: string
) {
  return supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('owner_id', ownerId)
    .single()
}

/** Get patients by owner_id (id, full_name) for lists/navigation, ordered by full_name. */
export async function getPatientsByOwnerIdMinimal(supabase: Supabase, ownerId: string) {
  return supabase
    .from('patients')
    .select('id, full_name')
    .eq('owner_id', ownerId)
    .order('full_name', { ascending: true })
}
