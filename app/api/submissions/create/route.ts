import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadPhotos } from '@/lib/blob'
import { generatePost } from '@/lib/gemini'
import { checkBotId } from '@/lib/botid'
import { validateFile, validateNotesLength, sanitizeForAI } from '@/lib/validation'
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Require authentication
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      return authCheck // Returns 401 if not authenticated
    }
    const session = authCheck

    const formData = await request.formData()
    const notes = formData.get('notes') as string
    const files = formData.getAll('photos') as File[]

    // Use authenticated email from session (don't trust form data)
    const email = session.email

    // Validate inputs
    if (!notes) {
      return NextResponse.json({ error: 'Notes required' }, { status: 400 })
    }

    // Validate notes length
    const notesValidation = validateNotesLength(notes)
    if (!notesValidation.valid) {
      return NextResponse.json({ error: notesValidation.error }, { status: 400 })
    }

    // Sanitize notes: removes prompt injection patterns and PII
    // This provides defense-in-depth protection per Google's recommendations
    const sanitizedNotes = sanitizeForAI(notes)

    // Validate and upload photos
    const photoPaths: string[] = []
    if (files.length > 0) {
      const validFiles: File[] = []
      for (const file of files) {
        if (file.size === 0) continue // Skip empty files
        
        const fileValidation = validateFile(file)
        if (!fileValidation.valid) {
          return NextResponse.json({ error: `File validation failed: ${fileValidation.error}` }, { status: 400 })
        }
        validFiles.push(file)
      }
      
      if (validFiles.length > 0) {
        const uploadedUrls = await uploadPhotos(validFiles)
      photoPaths.push(...uploadedUrls)
      }
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        notes: sanitizedNotes,
        photoPaths,
        submittedByEmail: email, // Use authenticated email from session
        status: 'draft',
      },
    })

    // Generate initial post with sanitized notes
    const generatedPost = await generatePost(sanitizedNotes)

    // Update submission with generated post
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        finalPostText: generatedPost,
      },
    })

    return NextResponse.json({
      submission: {
        id: updatedSubmission.id,
        finalPostText: updatedSubmission.finalPostText,
        photoPaths: updatedSubmission.photoPaths,
      },
    })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}

