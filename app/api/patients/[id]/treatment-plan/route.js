import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { clinicId, doctorId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { visitId, action, findings, clinicalNotes, medicalHistory, items } = body

    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

    const visit = await verifyVisitAccess(visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    if (action === 'generate') {
      const prompt = `You are an AI dental assistant helping a licensed dentist create a treatment plan.

PATIENT FINDINGS:
Tooth findings: ${JSON.stringify(findings)}
Clinical notes: ${clinicalNotes}

MEDICAL HISTORY:
Chief complaint: ${medicalHistory.chiefComplaint}
Medical conditions: ${JSON.stringify(medicalHistory.conditions)}
Current medications: ${JSON.stringify(medicalHistory.medications)}

Based on these findings, suggest a dental treatment plan. For each procedure:
- Use standard dental procedure names
- Assign urgency: URGENT (pain/infection), SOON (active disease), PLANNED (elective), MONITOR (watch)
- Estimate cost in Indian Rupees (INR)
- Estimate number of sittings needed
- Reference the tooth number where applicable

Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks. Just raw JSON.
Format:
[
  {
    "procedureName": "Root Canal Treatment",
    "toothRef": "46",
    "urgency": "URGENT",
    "estimatedCost": 4500,
    "estimatedSessions": 2
  }
]

If no treatment is needed, return: []`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = response.content[0].text.trim()
      let generatedItems = []
      try {
        generatedItems = JSON.parse(responseText)
      } catch (e) {
        const match = responseText.match(/\[[\s\S]*\]/)
        if (match) generatedItems = JSON.parse(match[0])
      }

      const itemsWithConsent = generatedItems.map(function(item) {
        return { ...item, consentStatus: 'PENDING' }
      })

      return NextResponse.json({ items: itemsWithConsent }, { status: 200 })
    }

    if (action === 'save') {
      const plan = await db.$transaction(async (tx) => {
        // Replace existing plan if present
        const existingPlan = await tx.treatmentPlan.findUnique({ where: { visitId } })
        if (existingPlan) {
          await tx.treatmentItem.deleteMany({ where: { treatmentPlanId: existingPlan.id } })
          await tx.treatmentPlan.delete({ where: { visitId } })
        }
        const created = await tx.treatmentPlan.create({
          data: {
            visitId,
            approvedBy: doctorId,
            treatmentItems: {
              create: (items || []).map(function(item) {
                return {
                  procedureName: item.procedureName,
                  toothRef: item.toothRef || null,
                  urgency: item.urgency || 'PLANNED',
                  estimatedCost: parseFloat(item.estimatedCost) || 0,
                  estimatedSessions: parseInt(item.estimatedSessions) || 1,
                  consentStatus: 'PENDING',
                }
              }),
            },
          },
          include: { treatmentItems: true },
        })
        await tx.visit.update({
          where: { id: visitId },
          data: { status: 'TREATMENT_PLANNED' },
        })
        return created
      })

      return NextResponse.json({ plan }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Treatment plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
