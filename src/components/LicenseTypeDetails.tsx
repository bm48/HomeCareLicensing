'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2, Clock, DollarSign, Calendar, Loader2, Plus, Save, X, FileText, UserCog, Edit2, Trash2, GripVertical, Users2, Copy } from 'lucide-react'
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
import { updateLicenseType } from '@/app/actions/configuration'
import ExpertProcessComingSoonModal from '@/components/ExpertProcessComingSoonModal'
import Modal from '@/components/Modal'
import { getAllLicenseRequirements, getStepsFromRequirement, getDocumentsFromRequirement, copySteps, copyDocuments } from '@/app/actions/license-requirements'

interface LicenseType {
  id: string
  state: string
  name: string
  description: string
  processing_time_display: string
  cost_display: string
  service_fee_display?: string
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
  estimated_days?: number | null
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
  const prevLicenseTypeRef = useRef<LicenseType | null>(null)
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
  
  // Copy form states
  const [showCopyStepsForm, setShowCopyStepsForm] = useState(false)
  const [showCopyDocumentsForm, setShowCopyDocumentsForm] = useState(false)
  const [showExpertComingSoonModal, setShowExpertComingSoonModal] = useState(false)
  
  // Copy form data
  const [availableLicenseRequirements, setAvailableLicenseRequirements] = useState<Array<{id: string, state: string, license_type: string}>>([])
  const [selectedSourceRequirementId, setSelectedSourceRequirementId] = useState<string>('')
  const [availableSteps, setAvailableSteps] = useState<Step[]>([])
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([])
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [isLoadingCopyData, setIsLoadingCopyData] = useState(false)
  
  // Edit states
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editingExpertStep, setEditingExpertStep] = useState<string | null>(null)
  
  // Form data
  const [stepFormData, setStepFormData] = useState({ stepName: '', description: '', estimatedDays: '' })
  const [documentFormData, setDocumentFormData] = useState({ documentName: '', description: '', isRequired: true })
  const [expertFormData, setExpertFormData] = useState({ phase: 'Pre-Application', stepTitle: '', description: '' })
  
  // Overview tab editable fields
  const [overviewFields, setOverviewFields] = useState({
    processingTime: '',
    applicationFee: '',
    serviceFee: '',
    renewalPeriod: ''
  })
  const [isSavingOverview, setIsSavingOverview] = useState(false)
  const [overviewSaveStatus, setOverviewSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const supabase = createClient()

  // Get default service fee if not set
  const getDefaultServiceFee = (lt: LicenseType | null) => {
    if (!lt) return '$0'
    if (lt.service_fee_display) return lt.service_fee_display
    // Calculate as 10% of application fee if not set
    const appFeeMatch = lt.cost_display?.replace(/[^0-9.]/g, '') || '0'
    const appFee = parseFloat(appFeeMatch)
    const serviceFee = appFee * 0.1
    return `$${serviceFee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Helper functions to extract and format values
  const extractNumber = (value: string): string => {
    // Extract numeric value (including decimals)
    const match = value.replace(/[^0-9.]/g, '')
    return match || '0'
  }

  // Extract processing time value preserving ranges (dashes)
  const extractProcessingTime = (value: string): string => {
    // Remove "days" and other text, but preserve numbers, dashes, and spaces
    const cleaned = value.replace(/days?/gi, '').trim()
    // Extract numbers, dashes, and spaces (for ranges like "45-90")
    const match = cleaned.replace(/[^0-9.\-\s]/g, '').trim()
    return match || ''
  }

  // Extract currency value preserving ranges (dashes)
  const extractCurrency = (value: string): string => {
    // Remove dollar signs and commas, but preserve numbers, dashes, and spaces
    const cleaned = value.replace(/[$,]/g, '').trim()
    // Extract numbers, dashes, and spaces (for ranges like "2500-4500")
    const match = cleaned.replace(/[^0-9.\-\s]/g, '').trim()
    return match || ''
  }

  const formatProcessingTime = (value: string): string => {
    // Check if it's a range (contains dash)
    if (value.includes('-')) {
      const parts = value.split('-').map(part => part.trim().replace(/[^0-9.]/g, ''))
      if (parts.length === 2 && parts[0] && parts[1]) {
        return `${parts[0]}-${parts[1]} days`
      }
    }
    const num = extractNumber(value)
    if (!num || num === '0') return ''
    return `${num} days`
  }

  const formatCurrency = (value: string): string => {
    // Check if it's a range (contains dash)
    if (value.includes('-')) {
      const parts = value.split('-').map(part => {
        const num = part.trim().replace(/[^0-9.]/g, '')
        if (!num) return ''
        const numValue = parseFloat(num)
        if (isNaN(numValue)) return ''
        return numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      })
      if (parts.length === 2 && parts[0] && parts[1]) {
        return `$${parts[0]}-$${parts[1]}`
      }
    }
    const num = extractNumber(value)
    if (!num || num === '0') return '$0'
    const numValue = parseFloat(num)
    if (isNaN(numValue)) return '$0'
    return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatRenewalPeriod = (value: string): string => {
    const num = extractNumber(value)
    if (!num || num === '0') return ''
    const numValue = parseFloat(num)
    if (isNaN(numValue)) return ''
    return numValue === 1 ? '1 year' : `${numValue} years`
  }

  // Initialize overview fields when license type changes
  useEffect(() => {
    if (licenseType) {
      setOverviewFields({
        processingTime: licenseType.processing_time_display || '',
        applicationFee: licenseType.cost_display || '',
        serviceFee: licenseType.service_fee_display || getDefaultServiceFee(licenseType),
        renewalPeriod: licenseType.renewal_period_display || ''
      })
      setOverviewSaveStatus('idle')
    }
  }, [licenseType])

  // Ref to track latest field values for saving
  const overviewFieldsRef = useRef(overviewFields)
  useEffect(() => {
    overviewFieldsRef.current = overviewFields
  }, [overviewFields])

  // Auto-save overview fields with debounce
  const handleOverviewFieldChange = (field: string, value: string) => {
    if (!licenseType) return

    // Update local state immediately
    const updatedFields = {
      ...overviewFields,
      [field]: value
    }
    setOverviewFields(updatedFields)
    overviewFieldsRef.current = updatedFields

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setOverviewSaveStatus('saving')

    // Debounce: save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const currentFields = overviewFieldsRef.current
        const updateData = {
          id: licenseType.id,
          renewalPeriod: currentFields.renewalPeriod || licenseType.renewal_period_display || '1 year',
          applicationFee: currentFields.applicationFee || licenseType.cost_display || '$0',
          serviceFee: currentFields.serviceFee || getDefaultServiceFee(licenseType),
          processingTime: currentFields.processingTime || licenseType.processing_time_display || '0 days'
        }

        const result = await updateLicenseType(updateData)
        if (result.error) {
          console.error('Error saving:', result.error)
          setOverviewSaveStatus('idle')
        } else {
          setOverviewSaveStatus('saved')
          // Hide success message after 3 seconds
          setTimeout(() => {
            setOverviewSaveStatus('idle')
          }, 3000)
        }
      } catch (error: any) {
        console.error('Error saving overview fields:', error)
        setOverviewSaveStatus('idle')
      }
    }, 1000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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
    // Only reset to 'general' tab when licenseType actually changes (not on every render)
    const licenseTypeChanged = prevLicenseTypeRef.current?.id !== licenseType?.id
    
    if (licenseType) {
      if (licenseTypeChanged) {
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
    
    // Update the ref to track the current licenseType
    prevLicenseTypeRef.current = licenseType
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseType, selectedState]) // Removed activeTab and loadData from dependencies

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
      estimatedDays: step.estimated_days != null ? String(step.estimated_days) : '',
    })
  }

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc.id)
    setDocumentFormData({
      documentName: doc.document_name,
      description: doc.description || '',
      isRequired: doc.is_required,
    })
  }

  const handleEditExpertStep = (step: Step) => {
    setEditingExpertStep(step.id)
    setExpertFormData({
      phase: step.phase || 'Pre-Application',
      stepTitle: step.step_name,
      description: step.description || '',
    })
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

  // Copy Steps handlers
  const handleShowCopyStepsForm = async () => {
    setShowCopyStepsForm(true)
    setSelectedSourceRequirementId('')
    setAvailableSteps([])
    setSelectedStepIds(new Set())
    setError(null)
    
    // Load available license requirements
    setIsLoadingCopyData(true)
    try {
      const result = await getAllLicenseRequirements()
      if (result.error) {
        setError(result.error)
      } else {
        // Filter out current license requirement
        const filtered = result.data?.filter(req => req.id !== requirementId) || []
        setAvailableLicenseRequirements(filtered)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load license requirements')
    } finally {
      setIsLoadingCopyData(false)
    }
  }

  const handleSourceRequirementChangeForSteps = async (requirementId: string) => {
    setSelectedSourceRequirementId(requirementId)
    setSelectedStepIds(new Set())
    
    if (!requirementId) {
      setAvailableSteps([])
      return
    }
    
    setIsLoadingCopyData(true)
    try {
      const result = await getStepsFromRequirement(requirementId)
      if (result.error) {
        setError(result.error)
        setAvailableSteps([])
      } else {
        setAvailableSteps(result.data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load steps')
      setAvailableSteps([])
    } finally {
      setIsLoadingCopyData(false)
    }
  }

  const toggleStepSelection = (stepId: string) => {
    const newSelected = new Set(selectedStepIds)
    if (newSelected.has(stepId)) {
      newSelected.delete(stepId)
    } else {
      newSelected.add(stepId)
    }
    setSelectedStepIds(newSelected)
  }

  const handleCopySteps = async () => {
    if (!requirementId || selectedStepIds.size === 0) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await copySteps(requirementId, Array.from(selectedStepIds))
      if (result.error) {
        setError(result.error)
      } else {
        setShowCopyStepsForm(false)
        setSelectedSourceRequirementId('')
        setAvailableSteps([])
        setSelectedStepIds(new Set())
        await loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to copy steps')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Copy Documents handlers
  const handleShowCopyDocumentsForm = async () => {
    setShowCopyDocumentsForm(true)
    setSelectedSourceRequirementId('')
    setAvailableDocuments([])
    setSelectedDocumentIds(new Set())
    setError(null)
    
    // Load available license requirements
    setIsLoadingCopyData(true)
    try {
      const result = await getAllLicenseRequirements()
      if (result.error) {
        setError(result.error)
      } else {
        // Filter out current license requirement
        const filtered = result.data?.filter(req => req.id !== requirementId) || []
        setAvailableLicenseRequirements(filtered)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load license requirements')
    } finally {
      setIsLoadingCopyData(false)
    }
  }

  const handleSourceRequirementChangeForDocuments = async (requirementId: string) => {
    setSelectedSourceRequirementId(requirementId)
    setSelectedDocumentIds(new Set())
    
    if (!requirementId) {
      setAvailableDocuments([])
      return
    }
    
    setIsLoadingCopyData(true)
    try {
      const result = await getDocumentsFromRequirement(requirementId)
      if (result.error) {
        setError(result.error)
        setAvailableDocuments([])
      } else {
        setAvailableDocuments(result.data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
      setAvailableDocuments([])
    } finally {
      setIsLoadingCopyData(false)
    }
  }

  const toggleDocumentSelection = (documentId: string) => {
    const newSelected = new Set(selectedDocumentIds)
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId)
    } else {
      newSelected.add(documentId)
    }
    setSelectedDocumentIds(newSelected)
  }

  const handleCopyDocuments = async () => {
    if (!requirementId || selectedDocumentIds.size === 0) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await copyDocuments(requirementId, Array.from(selectedDocumentIds))
      if (result.error) {
        setError(result.error)
      } else {
        setShowCopyDocumentsForm(false)
        setSelectedSourceRequirementId('')
        setAvailableDocuments([])
        setSelectedDocumentIds(new Set())
        await loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to copy documents')
    } finally {
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
      {/* <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{licenseType.name}</h2>
        <p className="text-sm text-gray-600 mt-1">{licenseType.description}</p>
      </div> */}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 bg-gray-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            General Info
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'steps'
                ? 'border-blue-600 text-blue-600 bg-gray-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Steps {stepsCount > 0 && `(${stepsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600 bg-gray-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents {documentsCount > 0 && `(${documentsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('expert')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'expert'
                ? 'border-blue-600 text-blue-600 bg-gray-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users2 className="w-4 h-4" />
            Expert Process
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
            ) : licenseType ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">License Requirements Details</h3>
                
                <div className="space-y-4">
                  {/* Average Processing Time */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Average Processing Time</label>
                    <input
                      type="text"
                      value={overviewFields.processingTime || licenseType.processing_time_display || ''}
                      onFocus={(e) => {
                        const rawValue = extractProcessingTime(e.target.value)
                        setOverviewFields({ ...overviewFields, processingTime: rawValue })
                        e.target.select()
                      }}
                      onBlur={(e) => {
                        const formatted = formatProcessingTime(e.target.value)
                        setOverviewFields({ ...overviewFields, processingTime: formatted })
                        if (formatted) {
                          handleOverviewFieldChange('processingTime', formatted)
                        }
                      }}
                      onChange={(e) => {
                        setOverviewFields({ ...overviewFields, processingTime: e.target.value })
                      }}
                      className="bg-white w-full text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -mx-2 -my-1 mb-2 hover:bg-white/50 transition-colors"
                      placeholder="60 days"
                    />
                    <p className="text-sm text-gray-600">How long it typically takes to process this license type</p>
                  </div>

                  {/* Application Fee */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Application Fee</label>
                    <input
                      type="text"
                      value={overviewFields.applicationFee || licenseType.cost_display || ''}
                      onFocus={(e) => {
                        const rawValue = extractCurrency(e.target.value)
                        setOverviewFields({ ...overviewFields, applicationFee: rawValue })
                        e.target.select()
                      }}
                      onBlur={(e) => {
                        const formatted = formatCurrency(e.target.value)
                        setOverviewFields({ ...overviewFields, applicationFee: formatted })
                        if (formatted) {
                          handleOverviewFieldChange('applicationFee', formatted)
                        }
                      }}
                      onChange={(e) => {
                        setOverviewFields({ ...overviewFields, applicationFee: e.target.value })
                      }}
                      className="bg-white w-full text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -mx-2 -my-1 mb-2 hover:bg-white/50 transition-colors"
                      placeholder="$500"
                    />
                    <p className="text-sm text-gray-600">Cost to apply for this license</p>
                  </div>

                  {/* Service Fee */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Service Fee</label>
                    <input
                      type="text"
                      value={overviewFields.serviceFee || licenseType.service_fee_display || getDefaultServiceFee(licenseType)}
                      onFocus={(e) => {
                        const numericValue = extractNumber(e.target.value)
                        setOverviewFields({ ...overviewFields, serviceFee: numericValue })
                        e.target.select()
                      }}
                      onBlur={(e) => {
                        const formatted = formatCurrency(e.target.value)
                        setOverviewFields({ ...overviewFields, serviceFee: formatted })
                        if (formatted) {
                          handleOverviewFieldChange('serviceFee', formatted)
                        }
                      }}
                      onChange={(e) => {
                        setOverviewFields({ ...overviewFields, serviceFee: e.target.value })
                      }}
                      className="bg-white w-full text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -mx-2 -my-1 mb-2 hover:bg-white/50 transition-colors"
                      placeholder="$3,500"
                    />
                    <p className="text-sm text-gray-600">Cost of helping the owner submit their license</p>
                  </div>

                  {/* Renewal Period */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Renewal Period</label>
                    <input
                      type="text"
                      value={overviewFields.renewalPeriod || licenseType.renewal_period_display || ''}
                      onFocus={(e) => {
                        const numericValue = extractNumber(e.target.value)
                        setOverviewFields({ ...overviewFields, renewalPeriod: numericValue })
                        e.target.select()
                      }}
                      onBlur={(e) => {
                        const formatted = formatRenewalPeriod(e.target.value)
                        setOverviewFields({ ...overviewFields, renewalPeriod: formatted })
                        if (formatted) {
                          handleOverviewFieldChange('renewalPeriod', formatted)
                        }
                      }}
                      onChange={(e) => {
                        setOverviewFields({ ...overviewFields, renewalPeriod: e.target.value })
                      }}
                      className="bg-white w-full text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -mx-2 -my-1 mb-2 hover:bg-white/50 transition-colors"
                      placeholder="1 year"
                    />
                    <p className="text-sm text-gray-600">How often the license must be renewed</p>
                  </div>
                </div>

                {/* Auto-save status message */}
                {overviewSaveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-4">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Changes are saved automatically</span>
                  </div>
                )}
                {overviewSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving changes...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Please select a license type to view details</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Licensing Steps</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShowCopyStepsForm}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy from Another License
                </button>
                <button
                  onClick={() => {
                    setShowStepForm(!showStepForm)
                    setError(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
            </div>

            {showCopyStepsForm && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Copy Steps from Another License</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select License Type to Copy From
                    </label>
                    <select
                      value={selectedSourceRequirementId}
                      onChange={(e) => handleSourceRequirementChangeForSteps(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoadingCopyData}
                    >
                      <option value="">Select a license type...</option>
                      {availableLicenseRequirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.state} - {req.license_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSourceRequirementId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Steps to Copy ({selectedStepIds.size} selected)
                      </label>
                      <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto bg-white">
                        {isLoadingCopyData ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          </div>
                        ) : availableSteps.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No steps available for this license type</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {availableSteps.map((step) => (
                              <label
                                key={step.id}
                                className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStepIds.has(step.id)}
                                  onChange={() => toggleStepSelection(step.id)}
                                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {step.step_order}. {step.step_name}
                                    </span>
                                  </div>
                                  {step.description && (
                                    <p className="text-sm text-gray-600">{step.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCopySteps}
                      disabled={isSubmitting || selectedStepIds.size === 0 || isLoadingCopyData}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Copy className="w-4 h-4" />
                      Copy {selectedStepIds.size} {selectedStepIds.size === 1 ? 'Step' : 'Steps'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCopyStepsForm(false)
                        setSelectedSourceRequirementId('')
                        setAvailableSteps([])
                        setSelectedStepIds(new Set())
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showStepForm && !editingStep && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Step</h4>
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

            {editingStep && (
              <Modal
                isOpen={!!editingStep}
                onClose={() => {
                  setEditingStep(null)
                  setStepFormData({ stepName: '', description: '', estimatedDays: '' })
                  setShowStepForm(false)
                  setError(null)
                }}
                title="Edit Step"
                size="lg"
              >
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
                        setEditingStep(null)
                        setStepFormData({ stepName: '', description: '', estimatedDays: '' })
                        setShowStepForm(false)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Modal>
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
                    className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0 cursor-move" />
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">{step.step_order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{step.step_name}</h4>
                      {step.description && (
                        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      )}
                      {step.estimated_days && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Estimated: {step.estimated_days} days</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditStep(step)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShowCopyDocumentsForm}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy from Another License
                </button>
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
            </div>

            {showCopyDocumentsForm && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Copy Documents from Another License</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select License Type to Copy From
                    </label>
                    <select
                      value={selectedSourceRequirementId}
                      onChange={(e) => handleSourceRequirementChangeForDocuments(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoadingCopyData}
                    >
                      <option value="">Select a license type...</option>
                      {availableLicenseRequirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.state} - {req.license_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSourceRequirementId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Documents to Copy ({selectedDocumentIds.size} selected)
                      </label>
                      <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto bg-white">
                        {isLoadingCopyData ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          </div>
                        ) : availableDocuments.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No documents available for this license type</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {availableDocuments.map((doc) => (
                              <label
                                key={doc.id}
                                className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDocumentIds.has(doc.id)}
                                  onChange={() => toggleDocumentSelection(doc.id)}
                                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {doc.document_name}
                                    </span>
                                    {doc.is_required && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-sm text-gray-600">{doc.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCopyDocuments}
                      disabled={isSubmitting || selectedDocumentIds.size === 0 || isLoadingCopyData}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Copy className="w-4 h-4" />
                      Copy {selectedDocumentIds.size} {selectedDocumentIds.size === 1 ? 'Document' : 'Documents'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCopyDocumentsForm(false)
                        setSelectedSourceRequirementId('')
                        setAvailableDocuments([])
                        setSelectedDocumentIds(new Set())
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDocumentForm && !editingDocument && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Document</h4>
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

            {editingDocument && (
              <Modal
                isOpen={!!editingDocument}
                onClose={() => {
                  setEditingDocument(null)
                  setDocumentFormData({ documentName: '', description: '', isRequired: true })
                  setShowDocumentForm(false)
                  setError(null)
                }}
                title="Edit Document"
                size="lg"
              >
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
                      id="isRequiredEdit"
                      checked={documentFormData.isRequired}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, isRequired: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isRequiredEdit" className="ml-2 text-sm font-medium text-gray-700">
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
                        setEditingDocument(null)
                        setDocumentFormData({ documentName: '', description: '', isRequired: true })
                        setShowDocumentForm(false)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Modal>
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
                    className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{doc.document_name}</h4>
                        {doc.is_required && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditDocument(doc)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expert' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expert Process Steps</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExpertComingSoonModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy from Another License
                </button>
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
            </div>

            {showExpertForm && !editingExpertStep && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Expert Step</h4>
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
                      <option value="Post-Application">Post-Application</option>
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

            {editingExpertStep && (
              <Modal
                isOpen={!!editingExpertStep}
                onClose={() => {
                  setEditingExpertStep(null)
                  setExpertFormData({ phase: 'Pre-Application', stepTitle: '', description: '' })
                  setShowExpertForm(false)
                  setError(null)
                }}
                title="Edit Expert Step"
                size="lg"
              >
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
                      <option value="Post-Application">Post-Application</option>
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
                        setEditingExpertStep(null)
                        setExpertFormData({ phase: 'Pre-Application', stepTitle: '', description: '' })
                        setShowExpertForm(false)
                        setError(null)
                      }}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Modal>
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
              <div className="space-y-6">
                {/* Pre-Application Steps */}
                {expertSteps.filter(s => s.phase === 'Pre-Application' || s.phase === 'Pre-Application Steps').length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Pre-Application Steps:</h4>
                    <div className="space-y-3">
                      {expertSteps
                        .filter(s => s.phase === 'Pre-Application' || s.phase === 'Pre-Application Steps')
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-white">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{step.step_name}</h4>
                              {step.description && (
                                <p className="text-sm text-gray-600">{step.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEditExpertStep(step)}
                                className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                        ))}
                    </div>
                  </div>
                )}

                {/* Post-Application Steps */}
                {expertSteps.filter(s => s.phase === 'Post-Application' || s.phase === 'Post-Application Steps').length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Post-Application Steps:</h4>
                    <div className="space-y-3">
                      {expertSteps
                        .filter(s => s.phase === 'Post-Application' || s.phase === 'Post-Application Steps')
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-white">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{step.step_name}</h4>
                              {step.description && (
                                <p className="text-sm text-gray-600">{step.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEditExpertStep(step)}
                                className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                        ))}
                    </div>
                  </div>
                )}

                {/* Other phases */}
                {expertSteps.filter(s => 
                  s.phase !== 'Pre-Application' && 
                  s.phase !== 'Pre-Application Steps' &&
                  s.phase !== 'Post-Application' && 
                  s.phase !== 'Post-Application Steps'
                ).length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Other Steps:</h4>
                    <div className="space-y-3">
                      {expertSteps
                        .filter(s => 
                          s.phase !== 'Pre-Application' && 
                          s.phase !== 'Pre-Application Steps' &&
                          s.phase !== 'Post-Application' && 
                          s.phase !== 'Post-Application Steps'
                        )
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-white">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{step.step_name}</h4>
                              {step.description && (
                                <p className="text-sm text-gray-600">{step.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEditExpertStep(step)}
                                className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                        ))}
                    </div>
                  </div>
                )}
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

      {/* Expert Process Coming Soon Modal */}
      <ExpertProcessComingSoonModal
        isOpen={showExpertComingSoonModal}
        onClose={() => setShowExpertComingSoonModal(false)}
      />
    </div>
  )
}
