'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface License {
  id: string
  license_name: string
  license_number: string | null
  state: string
  status: string
  activated_date: string | Date | null
  expiry_date: string | Date | null
  renewal_due_date: string | Date | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface Document {
  id: string
  document_name: string
  document_url: string
  document_type: string | null
  created_at: string
}

interface LicenseDetailContentProps {
  license: License
  documents: Document[]
}

export default function LicenseDetailContent({
  license,
  documents
}: LicenseDetailContentProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)

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
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'expiring':
        return 'bg-orange-100 text-orange-700'
      case 'expired':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'expiring':
        return 'Expiring Soon'
      case 'expired':
        return 'Expired'
      case 'pending':
        return 'Pending'
      default:
        return status.split('_').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'expiring':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
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

  const handleUploadDocument = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsUploading(true)
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('You must be logged in to upload documents')
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${license.id}/${Date.now()}.${fileExt}`
        
        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('license-documents')
          .upload(fileName, file, {
            upsert: false,
            contentType: file.type || `image/${fileExt}`,
            cacheControl: '3600',
          })

        if (uploadError) {
          console.error('Upload error details:', uploadError)
          const errorMsg = uploadError.message || 'Failed to upload file'
          throw new Error(`Upload failed: ${errorMsg}. Please check storage bucket exists and policies are configured.`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('license-documents')
          .getPublicUrl(fileName)

        // Create document record
        const { error: docError } = await supabase
          .from('license_documents')
          .insert({
            license_id: license.id,
            document_name: file.name,
            document_url: publicUrl,
            document_type: fileExt?.toLowerCase() || null
          })

        if (docError) {
          // If insert fails, try to delete the uploaded file
          await supabase.storage
            .from('license-documents')
            .remove([fileName])
          throw docError
        }

        router.refresh()
      } catch (error: any) {
        console.error('Error uploading document:', error)
        const errorMsg = error.message || error.error?.message || 'Failed to upload document. Please try again.'
        alert(errorMsg)
      } finally {
        setIsUploading(false)
      }
    }
    input.click()
  }

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!license.expiry_date) return null
    const expiryDate = new Date(license.expiry_date)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilExpiry = getDaysUntilExpiry()

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/licenses"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{license.license_name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{license.state}</span>
              </div>
              {license.license_number && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>License #: {license.license_number}</span>
                </div>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusBadge(license.status)}`}>
                {getStatusIcon(license.status)}
                {getStatusDisplay(license.status)}
              </span>
            </div>
          </div>
          <button
            onClick={handleUploadDocument}
            disabled={isUploading}
            className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Document
              </>
            )}
          </button>
        </div>

        {/* License Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Activated Date</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatDate(license.activated_date)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-red-600" />
              <span className="text-sm font-semibold text-gray-600">Expiry Date</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatDate(license.expiry_date)}</div>
            {daysUntilExpiry !== null && (
              <div className="text-sm text-gray-600 mt-1">
                {daysUntilExpiry > 0 ? (
                  <span className="text-orange-600">{daysUntilExpiry} days remaining</span>
                ) : daysUntilExpiry === 0 ? (
                  <span className="text-red-600">Expires today</span>
                ) : (
                  <span className="text-red-600">Expired {Math.abs(daysUntilExpiry)} days ago</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-green-600" />
              <span className="text-sm font-semibold text-gray-600">Renewal Due Date</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatDate(license.renewal_due_date)}</div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">License Documents</h2>
            <span className="text-sm text-gray-600">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6">Upload your first document to get started</p>
              <button
                onClick={handleUploadDocument}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Document
                  </>
                )}
              </button>
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
