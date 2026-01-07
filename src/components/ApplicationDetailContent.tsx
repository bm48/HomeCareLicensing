'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin
} from 'lucide-react'
import UploadDocumentButton from './UploadDocumentButton'

interface Application {
  id: string
  application_name: string
  state: string
  status: string
  progress_percentage: number | null
  started_date: string | Date | null
  last_updated_date: string | Date | null
  submitted_date: string | Date | null
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  status: string
  created_at: string
}

interface ApplicationDetailContentProps {
  application: Application
  documents: Document[]
}

export default function ApplicationDetailContent({
  application,
  documents
}: ApplicationDetailContentProps) {
  const router = useRouter()

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const getStateAbbr = (state: string) => {
    return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-yellow-100 text-yellow-700'
    }
  }

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

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
      // Fallback: open in new tab
      window.open(documentUrl, '_blank')
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/applications"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{application.application_name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{application.state}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(application.status)}`}>
                {getStatusDisplay(application.status)}
              </span>
            </div>
          </div>
          <UploadDocumentButton 
            applicationId={application.id}
            className="px-6 py-3 text-base"
          />
        </div>

        {/* Application Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Started Date</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatDate(application.started_date)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-green-600" />
              <span className="text-sm font-semibold text-gray-600">Last Updated</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatDate(application.last_updated_date)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-semibold text-gray-600">Progress</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{application.progress_percentage || 0}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${application.progress_percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Application Documents</h2>
            <span className="text-sm text-gray-600">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6">Upload your first document to get started</p>
              <UploadDocumentButton 
                applicationId={application.id}
                className="inline-flex items-center gap-2 px-6 py-3 text-base"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{document.document_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getDocumentStatusBadge(document.status)}`}>
                          {getDocumentStatusIcon(document.status)}
                          {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {document.document_type && (
                          <span className="capitalize">{document.document_type}</span>
                        )}
                        <span>Uploaded {formatDate(document.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(document.document_url, document.document_name)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                    <a
                      href={document.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="View"
                    >
                      <FileText className="w-5 h-5 text-gray-600" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  )
}

