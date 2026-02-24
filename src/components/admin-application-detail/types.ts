export interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  submitted_date: string | Date | null
  created_at: string | Date | null
  company_owner_id: string
  assigned_expert_id?: string | null
  license_type_id?: string | null
  revision_reason?: string | null
  user_profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  expert_profile: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
  license_requirement_document_id?: string | null
}

export interface RequirementDocument {
  id: string
  document_name: string
  document_type: string | null
  description: string | null
  is_required: boolean
}

export interface ApplicationStep {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_completed?: boolean
  is_expert_step?: boolean
  created_by_expert_id?: string | null
}

export interface AdminApplicationDetailContentProps {
  application: Application
  documents: Document[]
  adminUserId: string
}

export type TabType = 'steps' | 'documents' | 'messages' | 'expert-process'
