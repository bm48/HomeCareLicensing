'use client'

import { Calendar, MapPin, Clock, Percent, User, Mail, Users, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import type { Application } from './types'
import { formatDate, getStatusBadge, getStatusDisplay, getStateAbbr } from './utils'

interface AdminApplicationDetailHeaderProps {
  application: Application
  completedSteps: number
  totalSteps: number
  completedDocuments: number
  totalDocuments: number
}

export default function AdminApplicationDetailHeader({
  application,
  completedSteps,
  totalSteps,
  completedDocuments,
  totalDocuments
}: AdminApplicationDetailHeaderProps) {
  return (
    <>
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
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusBadge(application.status)}`}
            >
              {getStatusDisplay(application.status)}
            </span>
          </div>
        </div>

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
          <div className="text-3xl font-bold text-gray-900">
            {completedSteps} of {totalSteps}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Documents</div>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {completedDocuments} of {totalDocuments}
          </div>
        </div>
      </div>
    </>
  )
}
