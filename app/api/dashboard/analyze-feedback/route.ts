import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkBotId } from '@/lib/botid'
import { requireAuth } from '@/lib/auth-middleware'
import { rateLimitByIP } from '@/lib/rate-limit'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizePromptInput } from '@/lib/validation'
import { SYSTEM_PROMPT } from '@/lib/gemini'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export async function POST(request: NextRequest) {
  try {
    // Require authentication first (authenticated users are trusted)
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      // Only check for bots if not authenticated
      const { isBot } = await checkBotId()
      if (isBot) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      return authCheck
    }

    // Rate limiting - this endpoint makes expensive AI calls
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 3, 60 * 60 * 1000) // 3 requests per hour (expensive operation)
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many analysis requests. Please try again later.',
          retryAfter: Math.ceil((ipRateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((ipRateLimit.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': ipRateLimit.limit.toString(),
            'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
            'X-RateLimit-Reset': ipRateLimit.reset.toString(),
          },
        }
      )
    }

    // Get all feedback entries from all submissions
    const allFeedback = await prisma.feedback.findMany({
      include: {
        submission: {
          select: {
            notes: true,
            finalPostText: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Analyse last 50 feedback entries
    })

    if (allFeedback.length === 0) {
      return NextResponse.json({ 
        suggestions: [],
        message: 'No feedback entries found to analyse.' 
      })
    }

    // Build analysis prompt with sanitised inputs to prevent prompt injection
    const feedbackSummary = allFeedback.map((fb, idx) => {
      // Sanitise all user inputs to prevent prompt injection
      const sanitizedNotes = sanitizePromptInput(fb.submission.notes.substring(0, 200))
      const sanitizedPostText = fb.submission.finalPostText 
        ? sanitizePromptInput(fb.submission.finalPostText.substring(0, 200))
        : 'N/A'
      const sanitizedFeedback = sanitizePromptInput(fb.feedbackText)
      
      return `Feedback ${idx + 1} (Version ${fb.versionNumber}):
- Original Notes: ${sanitizedNotes}...
- AI Output: ${sanitizedPostText}...
- User Feedback: ${sanitizedFeedback}`
    }).join('\n\n')

    const analysisPrompt = `You are analysing user feedback on AI-generated social media posts to improve the system prompt.

Current System Prompt:
${SYSTEM_PROMPT}

User Feedback Collected:
${feedbackSummary}

Analyse the feedback patterns and provide specific, actionable suggestions to improve the system prompt. Focus on:
1. Common issues mentioned in feedback
2. Areas where the prompt could be clearer or more specific
3. Missing guidelines that would prevent the issues
4. Specific wording improvements

Provide your analysis as a structured list of suggestions, each with:
- A clear title
- The specific improvement to make
- Why this change would help based on the feedback

Format your response as a JSON array of objects with this structure:
[
  {
    "title": "Suggestion title",
    "improvement": "Specific change to make to the prompt",
    "rationale": "Why this helps based on feedback patterns"
  }
]`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
    })

    const responseText = result.response.text()
    
    // Try to extract JSON from the response
    let suggestions: Array<{ title: string; improvement: string; rationale: string }> = []
    try {
      // Look for JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        // Validate and sanitize the parsed suggestions
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .filter((item: any) => item && typeof item === 'object')
            .map((item: any) => ({
              title: sanitizePromptInput(String(item.title || 'Untitled').substring(0, 200)),
              improvement: sanitizePromptInput(String(item.improvement || '').substring(0, 2000)),
              rationale: sanitizePromptInput(String(item.rationale || '').substring(0, 2000)),
            }))
            .slice(0, 10) // Limit to 10 suggestions max
        }
      } else {
        // Fallback: parse the entire response as JSON
        const parsed = JSON.parse(responseText)
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .filter((item: any) => item && typeof item === 'object')
            .map((item: any) => ({
              title: sanitizePromptInput(String(item.title || 'Untitled').substring(0, 200)),
              improvement: sanitizePromptInput(String(item.improvement || '').substring(0, 2000)),
              rationale: sanitizePromptInput(String(item.rationale || '').substring(0, 2000)),
            }))
            .slice(0, 10) // Limit to 10 suggestions max
        }
      }
    } catch (error) {
      // If JSON parsing fails, create a structured response from the text
      // Sanitize the response text to prevent XSS
      const sanitizedText = sanitizePromptInput(responseText.substring(0, 500))
      suggestions = [{
        title: 'Analysis Complete',
        improvement: sanitizedText,
        rationale: 'AI analysis of feedback patterns'
      }]
    }

    return NextResponse.json({ 
      suggestions,
      feedbackCount: allFeedback.length 
    })
  } catch (error) {
    console.error('Error analyzing feedback:', error)
    return NextResponse.json(
      { error: 'Failed to analyse feedback' },
      { status: 500 }
    )
  }
}

