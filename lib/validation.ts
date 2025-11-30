// Validation utilities for security

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_NOTES_LENGTH = 10000 // characters
const MAX_FEEDBACK_LENGTH = 2000 // characters

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates file uploads for security
 */
export function validateFile(file: File): FileValidationResult {
  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'Empty file not allowed' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    }
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    }
  }

  // Sanitize filename - remove path traversal and dangerous characters
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric (except . _ -) with _
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/^\.+/, '') // Remove leading dots
  
  if (sanitizedName !== file.name) {
    return { 
      valid: false, 
      error: 'Invalid filename. Filename contains dangerous characters' 
    }
  }

  // Check filename length
  if (sanitizedName.length > 255) {
    return { valid: false, error: 'Filename too long' }
  }

  return { valid: true }
}

/**
 * Validates notes input length
 */
export function validateNotesLength(notes: string): FileValidationResult {
  if (!notes || notes.trim().length === 0) {
    return { valid: false, error: 'Notes cannot be empty' }
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { 
      valid: false, 
      error: `Notes exceed maximum length of ${MAX_NOTES_LENGTH} characters` 
    }
  }

  return { valid: true }
}

/**
 * Validates feedback input length
 */
export function validateFeedbackLength(feedback: string): FileValidationResult {
  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return { 
      valid: false, 
      error: `Feedback exceeds maximum length of ${MAX_FEEDBACK_LENGTH} characters` 
    }
  }

  return { valid: true }
}

/**
 * Sanitizes user input to prevent prompt injection attacks
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove prompt injection patterns
  const dangerousPatterns = [
    /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
    /system\s+prompt/gi,
    /forget\s+(previous|all)/gi,
    /you\s+are\s+now/gi,
    /override\s+(previous|system)/gi,
    /disregard\s+(previous|all|above)/gi,
    /new\s+instructions?/gi,
    /act\s+as\s+if/gi,
    /pretend\s+to\s+be/gi,
    /output\s+(your|the)\s+system/gi,
    /reveal\s+(your|the)\s+prompt/gi,
    /show\s+(me|us)\s+(your|the)\s+prompt/gi,
  ]

  let sanitized = input
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[removed]')
  }

  // Limit length to prevent cost-based attacks
  if (sanitized.length > MAX_NOTES_LENGTH) {
    sanitized = sanitized.substring(0, MAX_NOTES_LENGTH)
  }

  // Remove excessive whitespace that might be used for obfuscation
  sanitized = sanitized.replace(/\s{3,}/g, ' ')

  return sanitized.trim()
}

/**
 * Validates email format and prevents header injection
 */
export function validateEmail(email: string): FileValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim()

  // Check for CRLF injection attempts
  if (/[\r\n]/.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Check length
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email address too long' }
  }

  return { valid: true }
}

/**
 * PII Detection Result
 */
export interface PIIDetectionResult {
  hasPII: boolean
  detectedTypes: string[]
  sanitizedText: string
  originalLength: number
  sanitizedLength: number
}

/**
 * Detects and sanitizes Personally Identifiable Information (PII) from text
 * 
 * This function identifies common PII patterns and redacts them to protect privacy.
 * Even though Google's Paid Services terms apply (EEA location), best practice
 * is to minimize PII exposure per Google's recommendations.
 * 
 * Detected PII types:
 * - Email addresses
 * - Phone numbers (Irish and international formats)
 * - Names (common Irish first/last name patterns)
 * - Addresses (Irish postcodes, street patterns)
 * - GPS coordinates (already prohibited but double-check)
 * - Medical record numbers
 * - Vehicle registration numbers
 * - Dates of birth
 */
export function sanitizePII(input: string): PIIDetectionResult {
  if (!input || typeof input !== 'string') {
    return {
      hasPII: false,
      detectedTypes: [],
      sanitizedText: '',
      originalLength: 0,
      sanitizedLength: 0,
    }
  }

  let sanitized = input
  const detectedTypes: string[] = []

  // Email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  if (emailPattern.test(sanitized)) {
    detectedTypes.push('email')
    sanitized = sanitized.replace(emailPattern, '[email redacted]')
  }

  // Phone numbers - Irish formats: 08X XXX XXXX, +353 8X XXX XXXX, (08X) XXX-XXXX
  // Also international formats
  const phonePatterns = [
    /\b(\+353|00353)?[\s-]?0?[1-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, // Irish
    /\b(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // International
    /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // Generic
  ]
  phonePatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      if (!detectedTypes.includes('phone')) {
        detectedTypes.push('phone')
      }
      sanitized = sanitized.replace(pattern, '[phone redacted]')
    }
  })

  // GPS coordinates (decimal degrees and degrees/minutes/seconds)
  const gpsPatterns = [
    /\b-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g, // Decimal: 54.6543, -8.1234
    /\b\d{1,3}°\s*\d{1,2}['\u2032]\s*\d{1,2}(\.\d+)?["\u2033]\s*[NS]\s*,\s*\d{1,3}°\s*\d{1,2}['\u2032]\s*\d{1,2}(\.\d+)?["\u2033]\s*[EW]\b/gi, // DMS format
  ]
  gpsPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      if (!detectedTypes.includes('gps')) {
        detectedTypes.push('gps')
      }
      sanitized = sanitized.replace(pattern, '[coordinates redacted]')
    }
  })

  // Irish postcodes (Eircode format: A12 BCDE or Dublin format)
  const postcodePattern = /\b([A-Z]{1,2}\d{1,2}\s?[A-Z0-9]{4}|Dublin\s+\d{1,2})\b/gi
  if (postcodePattern.test(sanitized)) {
    detectedTypes.push('postcode')
    sanitized = sanitized.replace(postcodePattern, '[location redacted]')
  }

  // Vehicle registration (Irish format: 12-XX-12345 or 131-XX-12345)
  const vehicleRegPattern = /\b\d{2,3}[\s-]?[A-Z]{1,2}[\s-]?\d{1,6}\b/gi
  if (vehicleRegPattern.test(sanitized)) {
    detectedTypes.push('vehicle_registration')
    sanitized = sanitized.replace(vehicleRegPattern, '[vehicle reg redacted]')
  }

  // Dates that might be DOB (format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  // Only flag if they look like DOB (years 1920-2010 range, or recent years for minors)
  const dobPattern = /\b(0[1-9]|[12][0-9]|3[01])[\/\-\.](0[1-9]|1[0-2])[\/\-\.](19[2-9][0-9]|20[0-1][0-9])\b/g
  if (dobPattern.test(sanitized)) {
    detectedTypes.push('date_of_birth')
    sanitized = sanitized.replace(dobPattern, '[date redacted]')
  }

  // Medical record numbers (common patterns: MR123456, MRN-123456, etc.)
  const medicalRecordPattern = /\b(MR|MRN|HSE|PPS)[\s-]?\d{6,}\b/gi
  if (medicalRecordPattern.test(sanitized)) {
    detectedTypes.push('medical_record')
    sanitized = sanitized.replace(medicalRecordPattern, '[medical record redacted]')
  }

  // PPS numbers (Irish Personal Public Service number: 1234567A or 1234567AB)
  const ppsPattern = /\b\d{7}[A-Z]{1,2}\b/gi
  if (ppsPattern.test(sanitized)) {
    detectedTypes.push('pps_number')
    sanitized = sanitized.replace(ppsPattern, '[PPS redacted]')
  }

  // Common Irish names (this is a conservative list - only very common names)
  // Note: This is less reliable, so we'll be conservative
  // We'll focus on full name patterns: "First Last" or "Mr/Mrs/Ms First Last"
  const namePattern = /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
  if (namePattern.test(sanitized)) {
    // Only flag if it's clearly a person's name with title
    detectedTypes.push('name_with_title')
    sanitized = sanitized.replace(namePattern, (match) => {
      const parts = match.split(/\s+/)
      return parts[0] + ' [name redacted]'
    })
  }

  return {
    hasPII: detectedTypes.length > 0,
    detectedTypes,
    sanitizedText: sanitized,
    originalLength: input.length,
    sanitizedLength: sanitized.length,
  }
}

/**
 * Sanitizes input for AI processing by removing both prompt injection patterns and PII
 * This is the recommended function to use before sending data to Gemini API
 */
export function sanitizeForAI(input: string): string {
  // First sanitize prompt injection
  let sanitized = sanitizePromptInput(input)
  
  // Then sanitize PII
  const piiResult = sanitizePII(sanitized)
  
  return piiResult.sanitizedText
}

