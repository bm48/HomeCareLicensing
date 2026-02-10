'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Close an application. Allowed when progress is 100%.
 * Expert and admin can close from the application detail page.
 */
export async function closeApplication(applicationId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: app, error: fetchError } = await supabase
    .from('applications')
    .select('id, progress_percentage, status')
    .eq('id', applicationId)
    .single()

  if (fetchError || !app) {
    return { error: 'Application not found' }
  }

  if (app.status === 'closed') {
    return { error: null } // already closed
  }

  const progress = app.progress_percentage ?? 0
  if (progress < 100) {
    return { error: 'Application can only be closed when progress is 100%' }
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: 'closed',
      last_updated_date: new Date().toISOString()
    })
    .eq('id', applicationId)

  if (updateError) {
    return { error: updateError.message }
  }
  return { error: null }
}
