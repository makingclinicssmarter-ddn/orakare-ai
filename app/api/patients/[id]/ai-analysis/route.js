import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request, props) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await props.params
    const formData = await request.formData()
    const image = formData.get('image')
    const visitId = formData.get('visitId')
    const clinicalNotes = formData.get('clinicalNotes') || ''

    if (!image || !visitId) {
      return NextResponse.json({ error: 'Image and visitId required' }, { status: 400 })
    }

    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: {
        medicalHistory: true,
        clinicalFindings: true,
      }
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const rawType = image.type || ''
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const imageType = allowedTypes.includes(rawType) ? rawType : 'image/jpeg'

    const medicalHistory = visit.medicalHistory
    const existingFindings = visit.clinicalFindings?.toothFindings || {}

    const contextPrompt = `You are an AI dental assistant helping a licensed dentist during a clinical examination. 
Your role is to suggest possible findings based on the provided clinical image and context. 
The dentist will review, confirm, or reject each suggestion.

PATIENT CONTEXT:
- Chief complaint: ${medicalHistory?.chiefComplaint || 'Not recorded'}
- Medical conditions: ${JSON.stringify(medicalHistory?.conditions || [])}
- Allergies: ${JSON.stringify(medicalHistory?.allergies || [])}
- Current medications: ${JSON.stringify(medicalHistory?.medications || [])}

DOCTOR'S CLINICAL NOTES:
${clinicalNotes || 'No notes added yet'}

EXISTING CHART FINDINGS:
${JSON.stringify(existingFindings)}

Based on the clinical image and the above context, suggest possible dental findings.
For each finding, specify the tooth number using FDI notation and the condition.

Valid conditions: caries, missing, rct, crown, fracture, mobility, sensitivity, periapical, healthy

Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks. Just the raw JSON array.
Format:
[
  {
    "tooth": 46,
    "condition": "caries",
    "confidence": "high",
    "reasoning": "Dark shadow visible on mesial surface"
  }
]

If you cannot identify specific findings, return an empty array: []`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: contextPrompt,
            },
          ],
        },
      ],
    })

    const responseText = response.content[0].text.trim()
    let suggestions = []

    try {
      suggestions = JSON.parse(responseText)
    } catch (e) {
      const match = responseText.match(/\[[\s\S]*\]/)
      if (match) {
        suggestions = JSON.parse(match[0])
      }
    }

    await db.clinicalFindings.upsert({
      where: { visitId },
      update: {
        aiSuggestions: suggestions,
        clinicalNotes: clinicalNotes || undefined,
      },
      create: {
        visitId,
        aiSuggestions: suggestions,
        clinicalNotes,
        toothFindings: {},
        examStartedAt: new Date(),
      },
    })

    
    return NextResponse.json({ suggestions }, { status: 200 })

  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}