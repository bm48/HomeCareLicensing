'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Download,
  Calendar,
  MapPin,
  User,
  Clock,
  Percent,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Mail,
  Users
} from 'lucide-react'

interface Application {
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

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface ApplicationStep {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_completed?: boolean
}

interface AdminApplicationDetailContentProps {
  application: Application
  documents: Document[]
}

export default function AdminApplicationDetailContent({
  application,
  documents: initialDocuments
}: AdminApplicationDetailContentProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [steps, setSteps] = useState<ApplicationStep[]>([])
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const supabase = createClient()

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700'
      case 'needs_revision':
        return 'bg-orange-100 text-orange-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
  }

  // Fetch steps for the application
  const fetchSteps = useCallback(async () => {
    if (!application) return
    
    setIsLoadingSteps(true)
    try {
      // First, try to fetch application_steps (steps specific to this application)
      const { data: applicationSteps, error: appStepsError } = await supabase
        .from('application_steps')
        .select('*')
        .eq('application_id', application.id)
        .order('step_order', { ascending: true })

      if (appStepsError) {
        console.error('Error fetching application steps:', appStepsError)
      }

      // If application_steps exist, use them
      if (applicationSteps && applicationSteps.length > 0) {
        setSteps(applicationSteps.map((step: any) => ({
          id: step.id,
          step_name: step.step_name,
          step_order: step.step_order,
          description: step.description,
          is_completed: step.is_completed
        })))
        setIsLoadingSteps(false)
        return
      }

      // If no application_steps exist, fetch required steps from license_requirement_steps
      if (application.license_type_id && application.state) {
        // Get license type name
        const { data: licenseType, error: licenseTypeError } = await supabase
          .from('license_types')
          .select('name')
          .eq('id', application.license_type_id)
          .maybeSingle()

        if (licenseTypeError || !licenseType || !licenseType.name) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        // Find license_requirement_id for this state and license type
        const { data: licenseRequirement, error: reqError } = await supabase
          .from('license_requirements')
          .select('id')
          .eq('state', application.state)
          .eq('license_type', licenseType.name)
          .maybeSingle()

        if (reqError || !licenseRequirement) {
          setSteps([])
          setIsLoadingSteps(false)
          return
        }

        // Fetch required steps from license_requirement_steps
        const { data: requiredSteps, error: stepsError } = await supabase
          .from('license_requirement_steps')
          .select('*')
          .eq('license_requirement_id', licenseRequirement.id)
          .eq('is_expert_step', false)
          .order('step_order', { ascending: true })

        if (stepsError) {
          console.error('Error fetching required steps:', stepsError)
          setSteps([])
        } else {
          setSteps((requiredSteps || []).map((step: any) => ({
            id: step.id,
            step_name: step.step_name,
            step_order: step.step_order,
            description: step.description,
            is_completed: false
          })))
        }
      } else {
        setSteps([])
      }
    } catch (error) {
      console.error('Error fetching steps:', error)
      setSteps([])
    } finally {
      setIsLoadingSteps(false)
    }
  }, [application, supabase])

  useEffect(() => {
    fetchSteps()
  }, [fetchSteps])

  const handleDownload = async (documentUrl: string, documentName: string) => {
    try {
      const response = await fetch(documentUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documentName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
      window.open(documentUrl, '_blank')
    }
  }

  const completedSteps = steps.filter(s => s.is_completed).length
  const totalSteps = steps.length

  return (
    <div className="space-y-6">
      {/* Application Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {getStateAbbr(application.state)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{application.application_name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {application.state}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {formatDate(application.created_at)}
                </span>
                {application.started_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started {formatDate(application.started_date)}
                  </span>
                )}
                {application.progress_percentage !== null && (
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    {application.progress_percentage}% Complete
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusBadge(application.status)}`}>
            {getStatusDisplay(application.status)}
          </span>
        </div>

        {/* Progress Bar */}
        {application.progress_percentage !== null && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${application.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Owner/Client Information */}
        {application.user_profiles && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{application.user_profiles.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Email:</span>
                <span>{application.user_profiles.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expert Information */}
        {application.expert_profile && (
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Expert
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{application.expert_profile.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Email:</span>
                <span>{application.expert_profile.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Revision Reason (if needs_revision) */}
        {application.status === 'needs_revision' && application.revision_reason && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Revision Required
            </h3>
            <p className="text-sm text-orange-800">{application.revision_reason}</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Overall Progress</div>
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{application.progress_percentage || 0}%</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Completed Steps</div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{completedSteps} of {totalSteps}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Documents</div>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{documents.length}</div>
        </div>
      </div>

      {/* Application Steps */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Application Steps</h2>
        {isLoadingSteps ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : steps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No steps found for this application</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-4 border rounded-lg ${
                  step.is_completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="mt-1">
                  {step.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">{step.step_name}</div>
                  {step.description && (
                    <div className="text-sm text-gray-600 mb-2">{step.description}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    Step {step.step_order} of {totalSteps}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Application Documents</h2>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{doc.document_name}</div>
                    <div className="text-sm text-gray-500">
                      Uploaded {formatDate(doc.created_at)}
                      {doc.document_type && ` • ${doc.document_type}`}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    doc.status === 'approved' || doc.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(doc.document_url, doc.document_name)}
                  className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
