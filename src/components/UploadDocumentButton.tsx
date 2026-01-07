'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UploadDocumentButtonProps {
  applicationId: string
  className?: string
}

export default function UploadDocumentButton({
  applicationId,
  className = ''
}: UploadDocumentButtonProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage(null)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to upload documents')
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${applicationId}/${Date.now()}.${fileExt}`
      const filePath = fileName

      // Upload with options: upsert allows overwriting, and we set content-type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || `image/${fileExt}`,
          cacheControl: '3600',
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        // Provide more detailed error message
        const errorMsg = uploadError.message || 'Failed to upload file'
        throw new Error(`Upload failed: ${errorMsg}. Please check storage bucket exists and policies are configured.`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('application-documents')
        .getPublicUrl(filePath)

      // Create document record in database
      const { error: insertError } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          document_name: file.name,
          document_url: publicUrl,
          document_type: null,
          status: 'pending'
        })

      if (insertError) {
        // If insert fails, try to delete the uploaded file
        await supabase.storage
          .from('application-documents')
          .remove([filePath])
        throw insertError
      }

      setUploadStatus('success')
      router.refresh()

      // Reset status after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle')
      }, 2000)
    } catch (err: any) {
      setUploadStatus('error')
      console.error('Upload error:', err)
      // Show more detailed error message
      const errorMsg = err.message || err.error?.message || 'Failed to upload document. Please try again.'
      setErrorMessage(errorMsg)
      
      // Reset status after 5 seconds to give user time to read the error
      setTimeout(() => {
        setUploadStatus('idle')
        setErrorMessage(null)
      }, 5000)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        disabled={isUploading}
      />
      <button
        onClick={handleClick}
        disabled={isUploading}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : uploadStatus === 'success' ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload
          </>
        )}
      </button>
      {uploadStatus === 'error' && errorMessage && (
        <div className="absolute top-full left-0 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

