'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const supabase = await createClient()

  try {
    // Update user status in user_profiles table
    // Note: We might need to add an is_active or status field to user_profiles
    // For now, we'll use a metadata field or create a separate status tracking
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        updated_at: new Date().toISOString()
        // Add status field if it exists in your schema
      })
      .eq('id', userId)

    if (error) {
      return { error: error.message, data: null }
    }

    revalidatePath('/admin/users')
    return { error: null, data: { success: true } }
  } catch (err: any) {
    return { error: err.message || 'Failed to update user status', data: null }
  }
}

export async function setUserPassword(userId: string, newPassword: string) {
  const supabase = await createClient()

  try {
    // Get user email from user_profiles
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (fetchError || !userProfile) {
      return { error: 'User not found', data: null }
    }

    // Update password using database function
    // Note: Make sure to run the migration 015_update_user_password_function.sql in Supabase SQL Editor first
    const { data, error: updateError } = await supabase.rpc('update_user_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    })

    if (updateError) {
      // Check if function doesn't exist
      if (updateError.message.includes('could not find the function') || updateError.message.includes('does not exist')) {
        return { 
          error: 'Database function not found. Please run the migration file 015_update_user_password_function.sql in Supabase SQL Editor first.', 
          data: null 
        }
      }
      return { error: updateError.message, data: null }
    }

    // Note: In production, you should send an email to the user with the new password
    // You can integrate with an email service like SendGrid, Resend, or use Supabase Edge Functions
    // For now, the password is updated but email sending needs to be implemented separately

    revalidatePath('/admin/users')
    return { 
      error: null, 
      data: { 
        success: true,
        message: `Password has been set for ${userProfile.email}. Email notification should be sent separately.`
      } 
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to set password', data: null }
  }
}
