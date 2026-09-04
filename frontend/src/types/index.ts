// Reflejo 1:1 de los schemas Pydantic de respuesta del backend (Parte 55 del plan).

export type RubricStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type EvaluationStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'AI_GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'FAILED'
  | 'CANCELLED'

export type ExtractionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EMPTY'

export type GenerationValidationStatus =
  | 'VALID'
  | 'INVALID_SCHEMA'
  | 'INVALID_CRITERIA'
  | 'INVALID_SCORE'
  | 'EMPTY_RESPONSE'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'BLOCKED'

export type RevisionField = 'SCORE' | 'FEEDBACK' | 'GENERAL_FEEDBACK' | 'LEVEL'

export type IncidentSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface PerformanceLevel {
  id: number
  name: string
  description: string | null
  score: number
  order: number
}

export interface RubricCriterion {
  id: number
  name: string
  description: string | null
  weight: number
  order: number
  levels: PerformanceLevel[]
}

export interface Rubric {
  id: number
  name: string
  description: string | null
  instructions: string | null
  status: RubricStatus
  version: number
  created_by: number
  created_at: string
  updated_at: string
  criteria: RubricCriterion[]
}

export interface RubricListItem {
  id: number
  name: string
  description: string | null
  status: RubricStatus
  version: number
  criteria_count: number
  total_weight: number
  updated_at: string
}

export interface PerformanceLevelInput {
  name: string
  description: string | null
  score: number
  order: number
}

export interface RubricCriterionInput {
  name: string
  description: string | null
  weight: number
  order: number
  levels: PerformanceLevelInput[]
}

export interface RubricInput {
  name: string
  description: string | null
  instructions: string | null
  criteria: RubricCriterionInput[]
}

export interface Submission {
  id: number
  assignment_id: number | null
  teacher_id: number
  student_identifier: string
  original_filename: string
  file_extension: string
  mime_type: string
  file_size_bytes: number
  extracted_text: string | null
  extraction_status: ExtractionStatus
  extraction_error: string | null
  created_at: string
}

export interface CriterionResult {
  id: number
  criterion_id: number
  criterion_name: string
  weight: number
  selected_level_id: number | null
  ai_suggested_score: number | null
  final_score: number
  weighted_score: number
  ai_feedback: string
  final_feedback: string
  evidence: string[]
  improvement_suggestion: string
  modified_by_teacher: boolean
}

export interface Generation {
  id: number
  generation_number: number
  prompt_version: string
  model_name: string
  prompt_context_summary: Record<string, unknown>
  raw_response: Record<string, unknown> | null
  validation_status: GenerationValidationStatus
  validation_errors: string[] | null
  latency_ms: number | null
  created_at: string
}

export interface Revision {
  id: number
  criterion_result_id: number | null
  field_changed: RevisionField
  previous_value: string
  new_value: string
  changed_by: number
  changed_at: string
}

export interface Evaluation {
  id: number
  submission_id: number
  rubric_id: number
  teacher_instructions: string | null
  general_feedback: string | null
  status: EvaluationStatus
  current_generation_id: number | null
  final_total_score: number | null
  final_max_score: number | null
  approved_by: number | null
  approved_at: string | null
  sent_to_lms_at: string | null
  created_at: string
  updated_at: string
  criterion_results: CriterionResult[]
}

/** Copia inmutable de la rubrica con la que se evaluo (Parte 27 del plan). */
export interface RubricSnapshot {
  rubric_id: number
  name: string
  description: string | null
  instructions: string | null
  version: number
  criteria: RubricCriterion[]
}

export interface EvaluationDetail extends Evaluation {
  rubric_version_snapshot: RubricSnapshot
  submission: Submission
  generations: Generation[]
  revisions: Revision[]
  lms_result_payload: Record<string, unknown> | null
}

export interface EvaluationSummary {
  id: number
  status: EvaluationStatus
  rubric_id: number
  rubric_name: string
  submission_id: number
  student_identifier: string
  original_filename: string
  final_total_score: number | null
  final_max_score: number | null
  generations_count: number
  sent_to_lms_at: string | null
  created_at: string
  updated_at: string
}

export interface CriterionReviewInput {
  criterion_id: number
  final_score?: number
  final_feedback?: string
}

export interface EvaluationReviewInput {
  criteria: CriterionReviewInput[]
  general_feedback?: string
}

export interface Incident {
  id: number
  related_entity_type: 'SUBMISSION' | 'EVALUATION' | 'GENERATION' | 'LMS_INTEGRATION'
  related_entity_id: number | null
  incident_type: string
  severity: IncidentSeverity
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface LMSIntegration {
  id: number
  name: string
  type: 'SIMULATOR' | 'LTI1_3'
  is_active: boolean
  created_at: string
}
