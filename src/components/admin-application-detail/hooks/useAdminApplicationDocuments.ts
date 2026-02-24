'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/query'
import type { Application, Document, RequirementDocument } from '../types'
import { downloadDocument } from '../utils'

export function useAdminApplicationDocuments(
  application: Application | null,
  initialDocuments: Document[],
  activeTab?: string
) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [requirementDocuments, setRequirementDocuments] = useState<RequirementDocument[]>([])
  const [isLoadingRequirementDocuments, setIsLoadingRequirementDocuments] = useState(false)
  const supabase = createClient()

  const fetchRequirementDocuments = useCallback(async () => {
    if (!application?.license_type_id) {
      setRequirementDocuments([])
      return
    }
    setIsLoadingRequirementDocuments(true)
    try {
      const { data: licenseTypeRow, error: licenseTypeError } = await q.getLicenseTypeById(
        supabase,
        application.license_type_id
      )
      if (licenseTypeError || !licenseTypeRow?.name) {
        setRequirementDocuments([])
        return
      }
      const requirementState = licenseTypeRow.state ?? application.state
      if (!requirementState) {
        setRequirementDocuments([])
        return
      }
      const { data: licenseRequirement, error: reqError } = await q.getLicenseRequirementByStateAndType(
        supabase,
        requirementState,
        licenseTypeRow.name
      )
      if (reqError || !licenseRequirement) {
        setRequirementDocuments([])
        return
      }
      const { data: reqDocs, error: docsError } = await q.getRequirementDocumentsForDisplay(
        supabase,
        licenseRequirement.id
      )
      if (docsError) {
        setRequirementDocuments([])
        return
      }
      setRequirementDocuments(
        (reqDocs || []).map((d: any) => ({
          id: d.id,
          document_name: d.document_name,
          document_type: d.document_type ?? null,
          description: null,
          is_required: d.is_required ?? true
        }))
      )
    } catch (e) {
      console.error('Error fetching requirement documents:', e)
      setRequirementDocuments([])
    } finally {
      setIsLoadingRequirementDocuments(false)
    }
  }, [application?.license_type_id, application?.state, supabase])

  useEffect(() => {
    fetchRequirementDocuments()
  }, [fetchRequirementDocuments])

  useEffect(() => {
    if (activeTab === 'documents' && application?.license_type_id) {
      fetchRequirementDocuments()
    }
  }, [activeTab, application?.license_type_id, fetchRequirementDocuments])

  const useTemplateForDocuments = !!application?.license_type_id
  const totalDocuments = useTemplateForDocuments ? requirementDocuments.length : documents.length
  const completedDocuments = useTemplateForDocuments
    ? requirementDocuments.filter((rd) =>
        documents.some(
          (d) =>
            d.license_requirement_document_id === rd.id && (d.status === 'approved' || d.status === 'completed')
        )
      ).length
    : documents.filter((d) => d.status === 'approved' || d.status === 'completed').length

  const getLinkedDocument = useCallback(
    (requirementDocId: string) => documents.find((d) => d.license_requirement_document_id === requirementDocId),
    [documents]
  )

  const handleDownload = useCallback(async (documentUrl: string, documentName: string) => {
    await downloadDocument(documentUrl, documentName)
  }, [])

  return {
    documents,
    requirementDocuments,
    isLoadingRequirementDocuments,
    fetchRequirementDocuments,
    useTemplateForDocuments,
    totalDocuments,
    completedDocuments,
    getLinkedDocument,
    handleDownload
  }
}
