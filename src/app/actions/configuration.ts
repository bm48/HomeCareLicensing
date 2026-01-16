'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Update pricing
export interface UpdatePricingData {
  ownerAdminLicense: number
  staffLicense: number
}

export async function updatePricing(data: UpdatePricingData) {
  const supabase = await createClient()

  try {
    // Check if pricing record exists
    const { data: existingPricing } = await supabase
      .from('pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPricing) {
      // Update existing pricing
      const { data: pricing, error } = await supabase
        .from('pricing')
        .update({
          owner_admin_license: data.ownerAdminLicense,
          staff_license: data.staffLicense,
        })
        .eq('id', existingPricing.id)
        .select()
        .single()

      if (error) {
        return { error: error.message, data: null }
      }

      revalidatePath('/admin/configuration')
      revalidatePath('/admin/billing')
      return { error: null, data: pricing }
    } else {
      // Create new pricing record
      const { data: pricing, error } = await supabase
        .from('pricing')
        .insert({
          owner_admin_license: data.ownerAdminLicense,
          staff_license: data.staffLicense,
        })
        .select()
        .single()

      if (error) {
        return { error: error.message, data: null }
      }

      revalidatePath('/admin/configuration')
      revalidatePath('/admin/billing')
      return { error: null, data: pricing }
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to update pricing', data: null }
  }
}

// Update license type
export interface UpdateLicenseTypeData {
  id: string
  renewalPeriod: string
  applicationFee: string
  serviceFee: string
  processingTime: string
}

export async function updateLicenseType(data: UpdateLicenseTypeData) {
  const supabase = await createClient()

  try {
    // Parse processing time (e.g., "60 days" -> 60)
    const processingTimeMatch = data.processingTime.match(/(\d+)/)
    const processingTimeMin = processingTimeMatch ? parseInt(processingTimeMatch[1]) : null
    const processingTimeMax = processingTimeMin ? processingTimeMin : null

    // Parse application fee (e.g., "$500" -> 500.00)
    const appFeeMatch = data.applicationFee.replace(/[^0-9.]/g, '')
    const costMin = appFeeMatch ? parseFloat(appFeeMatch) : null
    const costMax = costMin

    // Parse service fee (e.g., "$3,500" -> 3500.00)
    const serviceFeeMatch = data.serviceFee.replace(/[^0-9.]/g, '')
    const serviceFeeValue = serviceFeeMatch ? parseFloat(serviceFeeMatch) : null

    // Parse renewal period (e.g., "1 year" -> 1)
    const renewalMatch = data.renewalPeriod.match(/(\d+)/)
    const renewalPeriodYears = renewalMatch ? parseInt(renewalMatch[1]) : 1

    const { data: licenseType, error } = await supabase
      .from('license_types')
      .update({
        cost_min: costMin,
        cost_max: costMax,
        cost_display: data.applicationFee,
        service_fee: serviceFeeValue || 0,
        service_fee_display: data.serviceFee,
        processing_time_min: processingTimeMin,
        processing_time_max: processingTimeMax,
        processing_time_display: data.processingTime,
        renewal_period_years: renewalPeriodYears,
        renewal_period_display: data.renewalPeriod,
      })
      .eq('id', data.id)
      .select()
      .single()

    if (error) {
      return { error: error.message, data: null }
    }

    revalidatePath('/admin/configuration')
    revalidatePath('/admin/billing')
    return { error: null, data: licenseType }
  } catch (err: any) {
    return { error: err.message || 'Failed to update license type', data: null }
  }
}
