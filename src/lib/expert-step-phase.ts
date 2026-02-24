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

/** Order for grouping expert steps by phase (includes legacy phase names for existing data). */
export const EXPERT_STEP_PHASE_ORDER: string[] = [
  ...EXPERT_STEP_PHASES.map((p) => p.value),
]
