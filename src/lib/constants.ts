/**
 * Expert process step phases. Used for phase select options in Add/Edit Expert Step modals
 * and for ordering phase groups when displaying expert steps.
 */

export const EXPERT_STEP_PHASES: { value: string; label: string }[] = [
  { value: 'Client Intake', label: 'Client Intake' },
  { value: 'Application Preparation', label: 'Application Preparation' },
  { value: 'Application Submission', label: 'Application Submission' },
  { value: 'Survey Preparation', label: 'Survey Preparation' },
  { value: 'Survey Guidance', label: 'Survey Guidance' },
]

export const DEFAULT_EXPERT_STEP_PHASE: string = EXPERT_STEP_PHASES[0].value

/** US state names (alphabetical) for dropdowns and forms. */
export const US_STATES: string[] = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
]
