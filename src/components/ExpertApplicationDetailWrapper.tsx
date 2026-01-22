'use client'

import { useState } from 'react'
import ApplicationDetailContent from './ApplicationDetailContent'

interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  submitted_date: string | Date | null
  license_type_id?: string | null
  assigned_expert_id?: string | null
  company_owner_id?: string
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface ExpertApplicationDetailWrapperProps {
  application: Application
  documents: Document[]
}

export default function ExpertApplicationDetailWrapper({
  application,
  documents
}: ExpertApplicationDetailWrapperProps) {
  const [activeTab, setActiveTab] = useState<'next-steps' | 'documents' | 'quick-actions' | 'requirements' | 'message'>('next-steps')

  return (
    <ApplicationDetailContent
      application={application}
      documents={documents}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showInlineTabs={true}
    />
  )
}
