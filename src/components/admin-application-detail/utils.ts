export function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getStatusBadge(status: string): string {
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
    case 'closed':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function getStatusDisplay(status: string): string {
  if (status === 'closed') return 'Closed'
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getStateAbbr(state: string): string {
  return state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase()
}

export async function downloadDocument(documentUrl: string, documentName: string): Promise<void> {
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
