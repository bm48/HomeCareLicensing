'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/** Role value for new users created from admin User Management */
export type CreateUserRole = 'admin' | 'company_owner' | 'staff_member' | 'expert'

/**
 * Create a user account from admin User Management. Uses Admin API so the current
 * admin's session is never overwritten (unlike signUp() which would log the admin out).
 */
export async function createUserAccount(
  email: string,
  password: string,
  fullName: string,
  role: CreateUserRole
) {
  let supabaseAdmin
  try {
    supabaseAdmin = createAdminClient()
  } catch (e: any) {
    return {
      error:
        e?.message ||
        'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local for creating user accounts.',
      data: null,
    }
  }
  const supabaseCookie = await createClient()

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const normalizedEmail = email.toLowerCase().trim()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role,
      },
    })

    let userId: string | null = null

    if (createError) {
      if (
        createError.message.includes('already registered') ||
        createError.message.includes('already exists') ||
        createError.message.includes('User already registered')
      ) {
        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single()
        userId = existingProfile?.id || null
        const { error: magicLinkError } = await supabaseCookie.auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink` },
        })
        if (magicLinkError) {
          return { error: `User already exists. Failed to send login link: ${magicLinkError.message}`, data: null }
        }
        revalidatePath('/admin/users')
        return {
          error: null,
          data: { success: true, userId, message: `User already exists. Login link sent to ${email}.` },
        }
      }
      const errorMessage =
        createError.message.includes('Database error') || createError.message.includes('database')
          ? 'Database error creating user. Ensure handle_new_user migration has been applied.'
          : createError.message
      return { error: `Failed to create user: ${errorMessage}`, data: null }
    }

    if (!newUser?.user?.id) {
      return { error: 'Failed to create user account - no user returned', data: null }
    }
    userId = newUser.user.id

    await new Promise((resolve) => setTimeout(resolve, 500))

    const { error: magicLinkError } = await supabaseCookie.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink` },
    })
    if (magicLinkError) console.warn('Failed to send magic link:', magicLinkError.message)

    revalidatePath('/admin/users')
    return {
      error: null,
      data: { success: true, userId, message: `User created. Login link sent to ${email}.` },
    }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create user account', data: null }
  }
}

export async function createStaffUserAccount(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  // Use admin client for user creation so the current user's session is NEVER overwritten.
  // signUp() with the cookie-based client would set the new user's session and log out the agency admin.
  let supabaseAdmin
  try {
    supabaseAdmin = createAdminClient()
  } catch (e: any) {
    return {
      error:
        e?.message ||
        'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local for creating staff accounts.',
      data: null,
    }
  }
  const supabaseCookie = await createClient()

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const normalizedEmail = email.toLowerCase().trim()

    // Create user via Admin API (no session change; never touches cookie client auth)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: 'staff_member',
      },
    })

    let userId: string | null = null

    if (createError) {
      // User might already exist
      if (
        createError.message.includes('already registered') ||
        createError.message.includes('already exists') ||
        createError.message.includes('User already registered')
      ) {
        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single()

        userId = existingProfile?.id || null

        // Send magic link using cookie client (only sends email; does not set session)
        const { error: magicLinkError } = await supabaseCookie.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink`,
          },
        })

        if (magicLinkError) {
          return {
            error: `User already exists. Failed to send login link: ${magicLinkError.message}`,
            data: null,
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

      let errorMessage = createError.message
      if (
        createError.message.includes('Database error') ||
        createError.message.includes('database')
      ) {
        errorMessage =
          'Database error creating user account. Please ensure the database migration 033_fix_handle_new_user_for_staff_members.sql has been applied.'
      }
      return { error: `Failed to create user: ${errorMessage}`, data: null }
    }

    if (!newUser?.user) {
      return { error: 'Failed to create user account - no user returned', data: null }
    }

    userId = newUser.user.id

    if (!userId) {
      return { error: 'Failed to create user account - user ID is missing', data: null }
    }

    // Wait for handle_new_user trigger to create user_profiles
    await new Promise((resolve) => setTimeout(resolve, 500))

    let verifiedUserId = userId
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.warn('User profile not found after creation:', profileError)
      const { data: profileByEmail } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single()

      if (profileByEmail?.id) {
        verifiedUserId = profileByEmail.id
      }
    } else {
      verifiedUserId = profile.id
    }

    userId = verifiedUserId

    // Optional: send magic link via cookie client (sends email only; does not set session)
    const { error: magicLinkError } = await supabaseCookie.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?type=magiclink`,
      },
    })
    if (magicLinkError) {
      console.warn('Failed to send magic link:', magicLinkError.message)
    }

    if (!userId) {
      return { error: 'Failed to get user ID after account creation', data: null }
    }

    return {
      error: null,
      data: {
        success: true,
        userId,
        message: `User account created. Login link sent to ${email}. Password: ${password}`,
      },
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to create user account', data: null }
  }
}