'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'

const licenseSchema = z.object({
  license_name: z.string().min(1, 'License name is required').min(3, 'License name must be at least 3 characters'),
  license_number: z.string().optional(),
  state: z.string().min(1, 'State is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  activated_date: z.string().optional(),
  renewal_due_date: z.string().optional(),
})

export type CreateLicenseFormData = z.infer<typeof licenseSchema>

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

interface CreateLicenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateLicenseModal({ isOpen, onClose, onSuccess }: CreateLicenseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateLicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      license_name: '',
      license_number: '',
      state: '',
      expiry_date: '',
      activated_date: '',
      renewal_due_date: '',
    },
  })

  const onSubmit = async (data: CreateLicenseFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setSubmitError('You must be logged in to create a license')
        return
      }

      const { error } = await supabase
        .from('licenses')
        .insert({
          company_owner_id: authUser.id,
          license_name: data.license_name,
          license_number: data.license_number || null,
          state: data.state,
          status: 'active',
          expiry_date: data.expiry_date,
          activated_date: data.activated_date || null,
          renewal_due_date: data.renewal_due_date || null,
        })
        .select()
        .single()

      if (error) throw error

      reset()
      onClose()
      onSuccess()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create license. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create License" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {submitError}
          </div>
        )}
        <div>
          <label htmlFor="license_name" className="block text-sm font-semibold text-gray-700 mb-1">
            License Name <span className="text-red-500">*</span>
          </label>
          <input
            id="license_name"
            type="text"
            {...register('license_name')}
            placeholder="e.g., Home Care Agency License"
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {errors.license_name && (
            <p className="mt-1 text-sm text-red-600">{errors.license_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            id="state"
            {...register('state')}
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="license_number" className="block text-sm font-semibold text-gray-700 mb-1">
            License Number
          </label>
          <input
            id="license_number"
            type="text"
            {...register('license_number')}
            placeholder="e.g., HC-12345"
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {errors.license_number && (
            <p className="mt-1 text-sm text-red-600">{errors.license_number.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="expiry_date" className="block text-sm font-semibold text-gray-700 mb-1">
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <input
            id="expiry_date"
            type="date"
            {...register('expiry_date')}
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {errors.expiry_date && (
            <p className="mt-1 text-sm text-red-600">{errors.expiry_date.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="activated_date" className="block text-sm font-semibold text-gray-700 mb-1">
              Activated Date
            </label>
            <input
              id="activated_date"
              type="date"
              {...register('activated_date')}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label htmlFor="renewal_due_date" className="block text-sm font-semibold text-gray-700 mb-1">
              Renewal Due Date
            </label>
            <input
              id="renewal_due_date"
              type="date"
              {...register('renewal_due_date')}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create License'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
