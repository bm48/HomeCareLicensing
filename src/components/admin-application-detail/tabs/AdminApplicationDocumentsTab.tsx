'use client'

import { FileText, Download, Loader2 } from 'lucide-react'
import type { Document, RequirementDocument } from '../types'
import { formatDate } from '../utils'

interface AdminApplicationDocumentsTabProps {
  documents: Document[]
  requirementDocuments: RequirementDocument[]
  isLoadingRequirementDocuments: boolean
  useTemplateForDocuments: boolean
  getLinkedDocument: (requirementDocId: string) => Document | undefined
  onDownload: (documentUrl: string, documentName: string) => void
}

export default function AdminApplicationDocumentsTab({
  documents,
  requirementDocuments,
  isLoadingRequirementDocuments,
  useTemplateForDocuments,
  getLinkedDocument,
  onDownload
}: AdminApplicationDocumentsTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Application Documents</h2>
      {isLoadingRequirementDocuments ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : useTemplateForDocuments && requirementDocuments.length > 0 ? (
        <div className="space-y-3">
          {requirementDocuments.map((reqDoc) => {
            const linked = getLinkedDocument(reqDoc.id)
            const displayName = linked?.document_name ?? reqDoc.document_name
            const categoryLabel =
              reqDoc.document_type || reqDoc.document_name.split(/[\s_]+/)[0] || 'Document'
            const status = linked
              ? linked.status === 'approved' || linked.status === 'completed'
                ? 'approved'
                : linked.status
              : 'pending'
            return (
              <div
                key={reqDoc.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{displayName}</div>
                    <div className="text-sm text-gray-500 mb-1">{categoryLabel}</div>
                    {linked && (
                      <div className="text-sm text-gray-500">
                        Uploaded {formatDate(linked.created_at)}
                        {linked.document_type && ` • ${linked.document_type}`}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      status === 'approved' || status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                {linked ? (
                  <button
                    onClick={() => onDownload(linked.document_url, linked.document_name)}
                    className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                ) : (
                  <span className="ml-4 text-sm text-gray-400 flex-shrink-0">Not uploaded</span>
                )}
              </div>
            )
          })}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">
            {useTemplateForDocuments && requirementDocuments.length === 0
              ? 'No required documents have been defined for this license type yet.'
              : 'No documents uploaded yet'}
          </p>
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
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    doc.status === 'approved' || doc.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
              <button
                onClick={() => onDownload(doc.document_url, doc.document_name)}
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
  )
}
