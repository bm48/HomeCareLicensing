'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAgency(name: string, agencyAdminId: string | null) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('agencies')
      .insert({
        name: name.trim(),
        agency_admin_id: agencyAdminId || null,
      })

    if (error) {
      return { error: error.message, data: null }
    }

    if (agencyAdminId) {
      const { error: clientError } = await supabase
        .from('clients')
        .update({ company_name: name.trim() })
        .eq('id', agencyAdminId)
      if (clientError) {
        console.error('Failed to set client company_name:', clientError)
      }
    }

    revalidatePath('/admin/agencies')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create agency', data: null }
  }
}

export async function updateAgency(
  id: string,
  name: string,
  agencyAdminId: string | null,
  previousAgencyAdminId: string | null
) {
  const supabase = await createClient()
  try {
    const trimmedName = name.trim()

    if (agencyAdminId) {
      const { error: clearError } = await supabase
        .from('agencies')
        .update({ agency_admin_id: null, updated_at: new Date().toISOString() })
        .eq('agency_admin_id', agencyAdminId)
        .neq('id', id)
      if (clearError) {
        console.error('Failed to clear other agencies from this admin:', clearError)
      }
    }

    const { error } = await supabase
      .from('agencies')
      .update({
        name: trimmedName,
        agency_admin_id: agencyAdminId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { error: error.message, data: null }
    }

    if (previousAgencyAdminId && previousAgencyAdminId !== agencyAdminId) {
      const { error: clearClientError } = await supabase
        .from('clients')
        .update({ company_name: '' })
        .eq('id', previousAgencyAdminId)
      if (clearClientError) {
        console.error('Failed to clear previous client company_name:', clearClientError)
      }
    }

    if (agencyAdminId) {
      const { error: clientError } = await supabase
        .from('clients')
        .update({ company_name: trimmedName })
        .eq('id', agencyAdminId)
      if (clientError) {
        console.error('Failed to set client company_name:', clientError)
      }
    }

    revalidatePath('/admin/agencies')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err?.message || 'Failed to update agency', data: null }
  }
}
