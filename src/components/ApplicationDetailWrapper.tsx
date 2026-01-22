'use client'

import { useState } from 'react'
import DashboardLayout from './DashboardLayout'
import ApplicationDetailContent from './ApplicationDetailContent'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface ApplicationDetailWrapperProps {
  application: Application
  documents: Document[]
  user: {
    id?: string
    email?: string | null
  }
  profile: {
    full_name?: string | null
    role?: string | null
  } | null
  unreadNotifications?: number
}

export default function ApplicationDetailWrapper({
  application,
  documents,
  user,
  profile,
  unreadNotifications = 0
}: ApplicationDetailWrapperProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'documents' | 'ai-assistant' | 'next-steps' | 'quick-actions' | 'requirements' | 'message'>('next-steps')

  return (
    <DashboardLayout
      user={user}
      profile={profile}
      unreadNotifications={unreadNotifications}
      application={{
        id: application.id,
        state: application.state,
        progress_percentage: application.progress_percentage
      }}
      activeLicenseTab={activeTab}
      onLicenseTabChange={setActiveTab}
    >
      
      <Link
          href="/dashboard/licenses"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Licenses
        </Link>
      <ApplicationDetailContent
        application={application}
        documents={documents}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showInlineTabs={true}
      />
    </DashboardLayout>
  )
}
