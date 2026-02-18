'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AgencyFormData = {
  companyName: string
  agencyAdminIds: string[]
  businessType: string
  taxId: string
  primaryLicenseNumber: string
  website?: string
  physicalStreetAddress: string
  physicalCity: string
  physicalState: string
  physicalZipCode: string
  sameAsPhysical: boolean
  mailingStreetAddress?: string
  mailingCity?: string
  mailingState?: string
  mailingZipCode?: string
}

function buildAgencyPayload(data: Omit<AgencyFormData, 'agencyAdminIds'>) {
  return {
    name: data.companyName.trim(),
    business_type: data.businessType.trim() || null,
    tax_id: data.taxId.trim() || null,
    primary_license_number: data.primaryLicenseNumber.trim() || null,
    website: data.website?.trim() || null,
    physical_street_address: data.physicalStreetAddress.trim() || null,
    physical_city: data.physicalCity.trim() || null,
    physical_state: data.physicalState.trim() || null,
    physical_zip_code: data.physicalZipCode.trim() || null,
    same_as_physical: data.sameAsPhysical ?? true,
    mailing_street_address: data.mailingStreetAddress?.trim() || null,
    mailing_city: data.mailingCity?.trim() || null,
    mailing_state: data.mailingState?.trim() || null,
    mailing_zip_code: data.mailingZipCode?.trim() || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createAgency(data: AgencyFormData) {
  const supabase = await createClient()
  try {
    const ids = (data.agencyAdminIds || []).filter(Boolean)
    const { error } = await supabase
      .from('agencies')
      .insert({
        ...buildAgencyPayload(data),
        agency_admin_ids: ids,
      })

    if (error) {
      return { error: error.message, data: null }
    }

    const trimmedName = data.companyName.trim()
    for (const clientId of ids) {
      const { error: clientError } = await supabase
        .from('clients')
        .update({ company_name: trimmedName })
        .eq('id', clientId)
      if (clientError) console.error('Failed to set client company_name:', clientError)
    }

    revalidatePath('/admin/agencies')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create agency', data: null }
  }
}

export async function updateAgency(
  id: string,
  data: AgencyFormData,
  previousAgencyAdminIds: string[]
) {
  const supabase = await createClient()
  try {
    const newIds = (data.agencyAdminIds || []).filter(Boolean)
    const prevSet = new Set(previousAgencyAdminIds)
    const newSet = new Set(newIds)

    for (const clientId of newIds) {
      const { data: otherAgencies } = await supabase
        .from('agencies')
        .select('id, agency_admin_ids')
        .neq('id', id)
      if (otherAgencies) {
        for (const ag of otherAgencies) {
          const arr = (ag.agency_admin_ids as string[]) || []
          if (arr.includes(clientId)) {
            const updated = arr.filter((x) => x !== clientId)
            await supabase
              .from('agencies')
              .update({ agency_admin_ids: updated, updated_at: new Date().toISOString() })
              .eq('id', ag.id)
          }
        }
      }
    }

    const { error } = await supabase
      .from('agencies')
      .update({
        ...buildAgencyPayload(data),
        agency_admin_ids: newIds,
      })
      .eq('id', id)

    if (error) {
      return { error: error.message, data: null }
    }

    for (const clientId of previousAgencyAdminIds) {
      if (!newSet.has(clientId)) {
        await supabase.from('clients').update({ company_name: '' }).eq('id', clientId)
      }
    }

    const trimmedName = data.companyName.trim()
    for (const clientId of newIds) {
      const { error: clientError } = await supabase
        .from('clients')
        .update({ company_name: trimmedName })
        .eq('id', clientId)
      if (clientError) console.error('Failed to set client company_name:', clientError)
    }

    revalidatePath('/admin/agencies')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err?.message || 'Failed to update agency', data: null }
  }
}

export type CompanyDetailsFormData = {
  companyName: string
  businessType: string
  taxId: string
  primaryLicenseNumber: string
  website?: string
  physicalStreetAddress: string
  physicalCity: string
  physicalState: string
  physicalZipCode: string
  sameAsPhysical: boolean
  mailingStreetAddress?: string
  mailingCity?: string
  mailingState?: string
  mailingZipCode?: string
}

export async function saveCompanyDetails(data: CompanyDetailsFormData) {
  const supabase = await createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return { error: 'Not authenticated', data: null }
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('company_owner_id', user.id)
      .maybeSingle()

    if (clientError || !client) {
      return { error: 'No client record found for your account.', data: null }
    }

    const payload = {
      name: data.companyName.trim(),
      business_type: data.businessType.trim() || null,
      tax_id: data.taxId.trim() || null,
      primary_license_number: data.primaryLicenseNumber.trim() || null,
      website: data.website?.trim() || null,
      physical_street_address: data.physicalStreetAddress.trim() || null,
      physical_city: data.physicalCity.trim() || null,
      physical_state: data.physicalState.trim() || null,
      physical_zip_code: data.physicalZipCode.trim() || null,
      same_as_physical: data.sameAsPhysical ?? true,
      mailing_street_address: data.mailingStreetAddress?.trim() || null,
      mailing_city: data.mailingCity?.trim() || null,
      mailing_state: data.mailingState?.trim() || null,
      mailing_zip_code: data.mailingZipCode?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .contains('agency_admin_ids', [client.id])
      .maybeSingle()

    if (existingAgency) {
      const { error: updateError } = await supabase
        .from('agencies')
        .update(payload)
        .eq('id', existingAgency.id)

      if (updateError) {
        return { error: updateError.message, data: null }
      }
    } else {
      const { error: insertError } = await supabase
        .from('agencies')
      .insert({
        ...payload,
        agency_admin_ids: [client.id],
      })

      if (insertError) {
        return { error: insertError.message, data: null }
      }
    }

    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ company_name: data.companyName.trim() })
      .eq('id', client.id)

    if (clientUpdateError) {
      console.error('Failed to update client company_name:', clientUpdateError)
    }

    revalidatePath('/dashboard/profile')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err?.message || 'Failed to save company details', data: null }
  }
}
