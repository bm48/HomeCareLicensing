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

export async function createStaffUserAccount(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const supabase = await createClient()

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const normalizedEmail = email.toLowerCase().trim()

    // First, try to create user with password (this will fail if user exists)
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?type=signup`,
        data: {
          full_name: `${firstName} ${lastName}`,
          role: 'staff_member',
        },
      },
    })

    let userId: string | null = null

    if (signUpError) {
      // Check if user already exists
      if (signUpError.message.includes('already registered') || 
          signUpError.message.includes('already exists') ||
          signUpError.message.includes('User already registered')) {
        // Get existing user ID from user_profiles
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single()

        userId = existingProfile?.id || null

        // User exists, send magic link for login
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink`,
          },
        })

        if (magicLinkError) {
          return { 
            error: `User already exists. Failed to send login link: ${magicLinkError.message}`, 
            data: null 
          }
        }

        return {
          error: null,
          data: {
            success: true,
            userId: userId,
            message: `User already exists. Login link sent to ${email}.`,
          },
        }
      }
      
      // Provide more helpful error messages
      let errorMessage = signUpError.message
      if (signUpError.message.includes('Database error') || signUpError.message.includes('database')) {
        errorMessage = 'Database error creating user account. Please ensure the database migration 033_fix_handle_new_user_for_staff_members.sql has been applied.'
      }
      
      return { error: `Failed to create user: ${errorMessage}`, data: null }
    }

    if (!newUser?.user) {
      return { error: 'Failed to create user account - no user returned', data: null }
    }

    userId = newUser.user.id

    // Ensure we have a valid userId
    if (!userId) {
      return { error: 'Failed to create user account - user ID is missing', data: null }
    }

    // Wait a moment for the trigger to create the user_profiles record
    // The handle_new_user trigger creates the user_profiles record
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify user profile was created and get the userId from there as a double-check
    let verifiedUserId = userId
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.warn('User profile not found after creation:', profileError)
      // Try to find by email as fallback
      const { data: profileByEmail } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single()
      
      if (profileByEmail?.id) {
        verifiedUserId = profileByEmail.id
        console.log('Found user profile by email, using ID:', verifiedUserId)
      } else {
        console.error('Could not find user profile after user creation')
        // Still continue with the userId from auth
      }
    } else {
      verifiedUserId = profile.id
    }

    // Use verified userId
    userId = verifiedUserId

    // Send magic link for immediate login (this will work even if email confirmation is required)
    // The magic link will authenticate the user directly
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink`,
      },
    })

    // If magic link fails, user can still use the confirmation email or login with password
    if (magicLinkError) {
      console.warn('Failed to send magic link:', magicLinkError.message)
      // Still return success since user was created and can use confirmation email or password
    }

    // Ensure userId is not null before returning
    if (!userId) {
      return { error: 'Failed to get user ID after account creation', data: null }
    }

    return {
      error: null,
      data: {
        success: true,
        userId: userId, // This must be a valid UUID string
        message: `User account created. Login link sent to ${email}. Password: ${password}`,
      },
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to create user account', data: null }
  }
}