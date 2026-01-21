'use server'

import { createClient } from '@/lib/supabase/server'

export interface StaffCertificationReportRow {
  staff_name: string
  contact: string
  certification: string
  cert_number: string
  state: string
  issuing_authority: string
  issue_date: string
  expiration: string
  status: 'Active' | 'Expiring Soon' | 'Expired'
  certification_id?: string
  document_url?: string | null
}

export interface ExpiringCertificationReportRow {
  staff_name: string
  contact: string
  certification: string
  cert_number: string
  expiration: string
  status: 'Expiring Soon' | 'Expired'
  certification_id?: string
  document_url?: string | null
}

export interface StaffRosterReportRow {
  staff_name: string
  email: string
  phone: string
  total_certifications: number
}

export async function getStaffCertificationsReport() {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'You must be logged in', data: null }
    }

    // Get all staff members for this company owner
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('id, first_name, last_name, email, phone, user_id')
      .eq('company_owner_id', user.id)
      .eq('status', 'active')

    if (staffError) {
      return { error: staffError.message, data: null }
    }

    if (!staffMembers || staffMembers.length === 0) {
      return { error: null, data: [] }
    }

    // Get user_ids from staff members
    const userIds = staffMembers
      .map(sm => sm.user_id)
      .filter((id): id is string => id !== null)

    if (userIds.length === 0) {
      return { error: null, data: [] }
    }

    // Get all certifications for these users
    const { data: certifications, error: certError } = await supabase
      .from('certifications')
      .select('*')
      .in('user_id', userIds)
      .order('expiration_date', { ascending: true })

    if (certError) {
      return { error: certError.message, data: null }
    }

    // Create a map of user_id to staff member
    const staffMap = new Map(
      staffMembers.map(sm => [sm.user_id, sm])
    )

    // Combine data
    const reportData: StaffCertificationReportRow[] = (certifications || []).map(cert => {
      const staff = staffMap.get(cert.user_id)
      const today = new Date()
      const expiry = new Date(cert.expiration_date)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let status: 'Active' | 'Expiring Soon' | 'Expired'
      if (daysUntilExpiry <= 0 || cert.status === 'Expired') {
        status = 'Expired'
      } else if (daysUntilExpiry <= 90) {
        status = 'Expiring Soon'
      } else {
        status = 'Active'
      }

      const staffName = staff 
        ? `${staff.first_name} ${staff.last_name}`
        : 'Unknown Staff'
      
      const contact = staff
        ? `${staff.email} ${staff.phone ? `(${staff.phone})` : ''}`
        : 'N/A'

      return {
        staff_name: staffName,
        contact: contact.trim(),
        certification: cert.type,
        cert_number: cert.license_number,
        state: cert.state || 'N/A',
        issuing_authority: cert.issuing_authority,
        issue_date: cert.issue_date 
          ? new Date(cert.issue_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
          : 'N/A',
        expiration: new Date(cert.expiration_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        status,
        certification_id: cert.id,
        document_url: cert.document_url
      }
    })

    return { error: null, data: reportData }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch report data', data: null }
  }
}

export async function getExpiringCertificationsReport() {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'You must be logged in', data: null }
    }

    // Get all staff members for this company owner
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('id, first_name, last_name, email, phone, user_id')
      .eq('company_owner_id', user.id)
      .eq('status', 'active')

    if (staffError) {
      return { error: staffError.message, data: null }
    }

    if (!staffMembers || staffMembers.length === 0) {
      return { error: null, data: [] }
    }

    // Get user_ids from staff members
    const userIds = staffMembers
      .map(sm => sm.user_id)
      .filter((id): id is string => id !== null)

    if (userIds.length === 0) {
      return { error: null, data: [] }
    }

    // Get all certifications for these users
    const { data: certifications, error: certError } = await supabase
      .from('certifications')
      .select('*')
      .in('user_id', userIds)
      .order('expiration_date', { ascending: true })

    if (certError) {
      return { error: certError.message, data: null }
    }

    // Create a map of user_id to staff member
    const staffMap = new Map(
      staffMembers.map(sm => [sm.user_id, sm])
    )

    const today = new Date()
    const ninetyDaysFromNow = new Date()
    ninetyDaysFromNow.setDate(today.getDate() + 90)

    // Filter certifications that are expiring soon or expired
    const reportData: ExpiringCertificationReportRow[] = (certifications || [])
      .filter(cert => {
        const expiry = new Date(cert.expiration_date)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 90 || cert.status === 'Expired'
      })
      .map(cert => {
        const staff = staffMap.get(cert.user_id)
        const expiry = new Date(cert.expiration_date)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        let status: 'Expiring Soon' | 'Expired'
        if (daysUntilExpiry <= 0 || cert.status === 'Expired') {
          status = 'Expired'
        } else {
          status = 'Expiring Soon'
        }

        const staffName = staff 
          ? `${staff.first_name} ${staff.last_name}`
          : 'Unknown Staff'
        
        const contact = staff
          ? `${staff.email} ${staff.phone ? `(${staff.phone})` : ''}`
          : 'N/A'

        return {
          staff_name: staffName,
          contact: contact.trim(),
          certification: cert.type,
          cert_number: cert.license_number,
          expiration: new Date(cert.expiration_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          status,
          certification_id: cert.id,
          document_url: cert.document_url
        }
      })

    return { error: null, data: reportData }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch report data', data: null }
  }
}

export async function getStaffRosterReport() {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'You must be logged in', data: null }
    }

    // Get all staff members for this company owner
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('id, first_name, last_name, email, phone, user_id')
      .eq('company_owner_id', user.id)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    if (staffError) {
      return { error: staffError.message, data: null }
    }

    if (!staffMembers || staffMembers.length === 0) {
      return { error: null, data: [] }
    }

    // Get user_ids from staff members
    const userIds = staffMembers
      .map(sm => sm.user_id)
      .filter((id): id is string => id !== null)

    // Get certification counts for each user
    const certificationCounts = new Map<string, number>()
    
    if (userIds.length > 0) {
      const { data: certifications } = await supabase
        .from('certifications')
        .select('user_id')
        .in('user_id', userIds)

      if (certifications) {
        certifications.forEach(cert => {
          const count = certificationCounts.get(cert.user_id) || 0
          certificationCounts.set(cert.user_id, count + 1)
        })
      }
    }

    // Build report data
    const reportData: StaffRosterReportRow[] = staffMembers.map(staff => {
      const staffName = `${staff.first_name} ${staff.last_name}`
      const certCount = staff.user_id ? (certificationCounts.get(staff.user_id) || 0) : 0

      return {
        staff_name: staffName,
        email: staff.email,
        phone: staff.phone || 'N/A',
        total_certifications: certCount
      }
    })

    return { error: null, data: reportData }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch report data', data: null }
  }
}
