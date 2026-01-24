'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateExpertData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  expertise?: string
  role?: string
  status?: 'active' | 'inactive'
}

export async function createExpert(data: CreateExpertData) {
  const supabase = await createClient()

  try {
    // Call the database function to create the expert
    // This function handles both user creation and licensing_expert record creation
    console.log('Creating expert:', data)
    console.log('RPC call parameters:', {
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_email: data.email,
      p_password: data.password,
      p_phone: data.phone || null,
      p_expertise: data.expertise || null,
      p_role: data.role || 'Licensing Specialist',
      p_status: data.status || 'active',
    })
    
    const { data: expertId, error } = await supabase.rpc('create_licensing_expert', {
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_email: data.email,
      p_password: data.password,
      p_phone: data.phone || null,
      p_expertise: data.expertise || null,
      p_role: data.role || 'Licensing Specialist',
      p_status: data.status || 'active',
    })
    console.log('RPC call result:', {
      expertId,
      error,
    })

    if (error) {
      return { error: error.message, data: null }
    }

    if (!expertId) {
      return { error: 'Failed to create expert', data: null }
    }

    // Fetch the created expert to return
    const { data: expert, error: fetchError } = await supabase
      .from('licensing_experts')
      .select('*')
      .eq('id', expertId)
      .single()

    if (fetchError) {
      // Expert was created but we can't fetch it - still return success
      return { error: null, data: { id: expertId } as any }
    }

    revalidatePath('/admin/experts')
    return { error: null, data: expert }
  } catch (err: any) {
    return { error: err.message || 'Failed to create expert', data: null }
  }
}
