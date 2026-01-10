'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, DollarSign, Calendar, Loader2, Plus, Save, X, FileText, UserCog, Edit2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  createStep, 
  createDocument, 
  createExpertStep, 
  getLicenseRequirementId,
  updateStep,
  updateDocument,
  updateExpertStep,
  deleteStep,
  deleteDocument,
  deleteExpertStep
} from '@/app/actions/license-requirements'

interface LicenseType {
  id: string
  state: string
  name: string
  description: string
  processing_time_display: string
  cost_display: string
  renewal_period_display: string
}

interface LicenseTypeDetailsProps {
  licenseType: LicenseType | null
  selectedState: string
}

type TabType = 'general' | 'steps' | 'documents' | 'expert'

interface Step {
  id: string
  step_name: string
  step_order: number
  description: string | null
  is_expert_step?: boolean
  phase?: string | null
}

interface Document {
  id: string
  document_name: string
  document_type: string | null
  description: string | null
  is_required: boolean
}

export default function LicenseTypeDetails({ licenseType, selectedState }: LicenseTypeDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [stepsCount, setStepsCount] = useState(0)
  const [expertStepsCount, setExpertStepsCount] = useState(0)
  const [documentsCount, setDocumentsCount] = useState(0)
  const [steps, setSteps] = useState<Step[]>([])
  const [expertSteps, setExpertSteps] = useState<Step[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requirementId, setRequirementId] = useState<string | null>(null)
  
  // Form states
  const [showStepForm, setShowStepForm] = useState(false)
  const [showDocumentForm, setShowDocumentForm] = useState(false)
  const [showExpertForm, setShowExpertForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Edit states
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editingExpertStep, setEditingExpertStep] = useState<string | null>(null)
  
  // Form data
  const [stepFormData, setStepFormData] = useState({ stepName: '', description: '', estimatedDays: '' })
  const [documentFormData, setDocumentFormData] = useState({ documentName: '', description: '', isRequired: true })
  const [expertFormData, setExpertFormData] = useState({ phase: 'Pre-Application', stepTitle: '', description: '' })
  
  const supabase = createClient()

  const loadData = useCallback(async () => {
    if (!licenseType) return

    setIsLoading(true)
    try {
      // Get or create license requirement
      const reqResult = await getLicenseRequirementId(selectedState, licenseType.name)
      if (reqResult.error || !reqResult.data) {
        setStepsCount(0)
        setDocumentsCount(0)
        setSteps([])
        setDocuments([])
        setRequirementId(null)
        setIsLoading(false)
        return
      }

      const reqId = reqResult.data
      setRequirementId(reqId)

      // Load steps and documents data
      const [stepsResult, docsResult] = await Promise.all([
        supabase
          .from('license_requirement_steps')
          .select('*')
          .eq('license_requirement_id', reqId)
          .order('step_order', { ascending: true }),
        supabase
          .from('license_requirement_documents')
          .select('*')
          .eq('license_requirement_id', reqId)
          .order('document_name', { ascending: true }),
      ])

      if (stepsResult.data) {
        // Separate regular steps from expert steps
        const regularSteps = stepsResult.data.filter(s => !s.is_expert_step || s.is_expert_step === false)
        const expertStepsData = stepsResult.data.filter(s => s.is_expert_step === true)
        
        setSteps(regularSteps)
        setExpertSteps(expertStepsData)
        setStepsCount(regularSteps.length)
        setExpertStepsCount(expertStepsData.length)
      } else {
        setSteps([])
        setExpertSteps([])
        setStepsCount(0)
        setExpertStepsCount(0)
      }

      if (docsResult.data) {
        setDocuments(docsResult.data)
        setDocumentsCount(docsResult.data.length)
      } else {
        setDocuments([])
        setDocumentsCount(0)
      }
    } catch (error) {
      setStepsCount(0)
      setDocumentsCount(0)
      setSteps([])
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseType, selectedState])

  useEffect(() => {
    if (licenseType) {
      if (activeTab !== 'general') {
        setActiveTab('general')
      }
      loadData()
    } else {
      setSteps([])
      setExpertSteps([])
      setDocuments([])
      setStepsCount(0)
      setExpertStepsCount(0)
      setDocumentsCount(0)
      setIsLoading(false)
      setRequirementId(null)
    }
  }, [licenseType, selectedState, activeTab, loadData])

  useEffect(() => {
    if (licenseType && (activeTab === 'steps' || activeTab === 'documents' || activeTab === 'expert')) {
      loadData()
    }
  }, [activeTab, licenseType, loadData])

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requirementId) return

    setIsSubmitting(true)
    setError(null)

    if (editingStep) {
      await handleUpdateStep(e)
      return
    }

    const result = await createStep({
      licenseRequirementId: requirementId,
      stepName: stepFormData.stepName,
      description: stepFormData.description,
      estimatedDays: stepFormData.estimatedDays ? parseInt(stepFormData.estimatedDays) : undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setStepFormData({ stepName: '', description: '', estimatedDays: '' })
      setShowStepForm(false)
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requirementId) return

    setIsSubmitting(true)
    setError(null)

    if (editingDocument) {
      await handleUpdateDocument(e)
      return
    }

    const result = await createDocument({
      licenseRequirementId: requirementId,
      documentName: documentFormData.documentName,
      description: documentFormData.description,
      isRequired: documentFormData.isRequired,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setDocumentFormData({ documentName: '', description: '', isRequired: true })
      setShowDocumentForm(false)
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleAddExpertStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requirementId) return

    setIsSubmitting(true)
    setError(null)

    if (editingExpertStep) {
      await handleUpdateExpertStep(e)
      return
    }

    const result = await createExpertStep({
      licenseRequirementId: requirementId,
      phase: expertFormData.phase,
      stepTitle: expertFormData.stepTitle,
      description: expertFormData.description,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setExpertFormData({ phase: 'Pre-Application', stepTitle: '', description: '' })
      setShowExpertForm(false)
      await loadData()
      setIsSubmitting(false)
    }
  }

  // Edit handlers
  const handleEditStep = (step: Step) => {
    setEditingStep(step.id)
    setStepFormData({
      stepName: step.step_name,
      description: step.description || '',
      estimatedDays: '',
    })
    setShowStepForm(true)
  }

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc.id)
    setDocumentFormData({
      documentName: doc.document_name,
      description: doc.description || '',
      isRequired: doc.is_required,
    })
    setShowDocumentForm(true)
  }

  const handleEditExpertStep = (step: Step) => {
    setEditingExpertStep(step.id)
    setExpertFormData({
      phase: step.phase || 'Pre-Application',
      stepTitle: step.step_name,
      description: step.description || '',
    })
    setShowExpertForm(true)
  }

  // Update handlers
  const handleUpdateStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStep) return

    setIsSubmitting(true)
    setError(null)

    const result = await updateStep(editingStep, {
      stepName: stepFormData.stepName,
      description: stepFormData.description,
      estimatedDays: stepFormData.estimatedDays ? parseInt(stepFormData.estimatedDays) : undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setStepFormData({ stepName: '', description: '', estimatedDays: '' })
      setShowStepForm(false)
      setEditingStep(null)
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDocument) return

    setIsSubmitting(true)
    setError(null)

    const result = await updateDocument(editingDocument, {
      documentName: documentFormData.documentName,
      description: documentFormData.description,
      isRequired: documentFormData.isRequired,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setDocumentFormData({ documentName: '', description: '', isRequired: true })
      setShowDocumentForm(false)
      setEditingDocument(null)
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleUpdateExpertStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpertStep) return

    setIsSubmitting(true)
    setError(null)

    const result = await updateExpertStep(editingExpertStep, {
      phase: expertFormData.phase,
      stepTitle: expertFormData.stepTitle,
      description: expertFormData.description,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setExpertFormData({ phase: 'Pre-Application', stepTitle: '', description: '' })
      setShowExpertForm(false)
      setEditingExpertStep(null)
      await loadData()
      setIsSubmitting(false)
    }
  }

  // Delete handlers
  const handleDeleteStep = async (id: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return

    setIsSubmitting(true)
    const result = await deleteStep(id)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    setIsSubmitting(true)
    const result = await deleteDocument(id)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      await loadData()
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpertStep = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expert step?')) return

    setIsSubmitting(true)
    const result = await deleteExpertStep(id)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      await loadData()
      setIsSubmitting(false)
    }
  }

  if (!licenseType) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-lg md:text-xl font-semibold text-gray-700 mb-2">Select a license type to manage requirements</p>
          <p className="text-sm md:text-base text-gray-500">Choose a license type from the left sidebar to view and edit steps and documents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{licenseType.name}</h2>
        </div>
        <p className="text-sm md:text-base text-gray-600 mt-2">{licenseType.description}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            General Info
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'steps'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Steps {stepsCount > 0 && `(${stepsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents {documentsCount > 0 && `(${documentsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('expert')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'expert'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expert Process {expertStepsCount > 0 && `(${expertStepsCount})`}
          </button>
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Loading license details...</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">License Requirements Details</h3>
                
                <div className="space-y-4">
                  {/* Processing Time */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Average Processing Time</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">{licenseType.processing_time_display}</p>
                      <p className="text-sm text-gray-600">How long it typically takes to process this license type</p>
                    </div>
                  </div>

                  {/* Application Fee */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Application Fee</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">{licenseType.cost_display}</p>
                      <p className="text-sm text-gray-600">Cost to apply for this license</p>
                    </div>
                  </div>

                  {/* Renewal Period */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Renewal Period</h4>
                      <p className="text-2xl font-bold text-gray-900 mb-1">{licenseType.renewal_period_display}</p>
                      <p className="text-sm text-gray-600">How often the license must be renewed</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Licensing Steps</h3>
              <button
                onClick={() => {
                  setShowStepForm(!showStepForm)
                  setError(null)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            {showStepForm && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingStep ? 'Edit Step' : 'Add New Step'}
                </h4>
                <form onSubmit={handleAddStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Step Title</label>
                    <input
                      type="text"
                      value={stepFormData.stepName}
                      onChange={(e) => setStepFormData({ ...stepFormData, stepName: e.target.value })}
                      placeholder="e.g., Complete Pre-Application Training"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={stepFormData.description}
                      onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                      placeholder="Detailed description of this step"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Days</label>
                    <input
                      type="number"
                      value={stepFormData.estimatedDays}
                      onChange={(e) => setStepFormData({ ...stepFormData, estimatedDays: e.target.value })}
                      placeholder="7"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save Step
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStepForm(false)
                        setStepFormData({ stepName: '', description: '', estimatedDays: '' })
                        setEditingStep(null)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Loading steps...</p>
                </div>
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No steps defined yet.</p>
                <p className="text-sm text-gray-400 mt-2">Add steps to define the process for this license type.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{step.step_order}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{step.step_name}</h4>
                        {step.description && (
                          <p className="text-sm text-gray-600">{step.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditStep(step)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit step"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          disabled={isSubmitting}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
              <button
                onClick={() => {
                  setShowDocumentForm(!showDocumentForm)
                  setError(null)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </button>
            </div>

            {showDocumentForm && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingDocument ? 'Edit Document' : 'Add New Document'}
                </h4>
                <form onSubmit={handleAddDocument} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                    <input
                      type="text"
                      value={documentFormData.documentName}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, documentName: e.target.value })}
                      placeholder="e.g., Application for License"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={documentFormData.description}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, description: e.target.value })}
                      placeholder="Brief description of this document"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isRequired"
                      checked={documentFormData.isRequired}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, isRequired: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isRequired" className="ml-2 text-sm font-medium text-gray-700">
                      Required Document
                    </label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      Save Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDocumentForm(false)
                        setDocumentFormData({ documentName: '', description: '', isRequired: true })
                        setEditingDocument(null)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Loading documents...</p>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No documents defined yet.</p>
                <p className="text-sm text-gray-400 mt-2">Add documents required for this license type.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{doc.document_name}</h4>
                          {doc.is_required && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        {doc.document_type && (
                          <p className="text-sm text-gray-500 mt-1">Type: {doc.document_type}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={isSubmitting}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expert' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expert Process Steps</h3>
              <button
                onClick={() => {
                  setShowExpertForm(!showExpertForm)
                  setError(null)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            {showExpertForm && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingExpertStep ? 'Edit Expert Step' : 'Add New Expert Step'}
                </h4>
                <form onSubmit={handleAddExpertStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                    <select
                      value={expertFormData.phase}
                      onChange={(e) => setExpertFormData({ ...expertFormData, phase: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Pre-Application">Pre-Application</option>
                      <option value="Application">Application</option>
                      <option value="Review">Review</option>
                      <option value="Post-Approval">Post-Approval</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Step Title</label>
                    <input
                      type="text"
                      value={expertFormData.stepTitle}
                      onChange={(e) => setExpertFormData({ ...expertFormData, stepTitle: e.target.value })}
                      placeholder="e.g., Initial Client Consultation"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={expertFormData.description}
                      onChange={(e) => setExpertFormData({ ...expertFormData, description: e.target.value })}
                      placeholder="Detailed description of this step"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save Step
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExpertForm(false)
                        setExpertFormData({ phase: 'Pre-Application', stepTitle: '', description: '' })
                        setEditingExpertStep(null)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Loading expert process steps...</p>
                </div>
              </div>
            ) : expertSteps.length === 0 ? (
              <div className="text-center py-8">
                <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No expert process steps defined yet.</p>
                <p className="text-sm text-gray-400 mt-2">Add expert steps to define the expert process for this license type.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expertSteps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">{step.step_order}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{step.step_name}</h4>
                          {step.phase && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              {step.phase}
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-sm text-gray-600">{step.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditExpertStep(step)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit expert step"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpertStep(step.id)}
                          disabled={isSubmitting}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete expert step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-save indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="w-4 h-4" />
        <span>Changes are saved automatically</span>
      </div>
    </div>
  )
}
