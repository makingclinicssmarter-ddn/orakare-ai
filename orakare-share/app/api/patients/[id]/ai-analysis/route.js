import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const IMAGE_TYPE_DESCRIPTIONS = {
  intraoral_photo: 'intraoral clinical photograph',
  opg: 'OPG (orthopantomogram / panoramic radiograph) — patient left is on the right side of the image',
  periapical: 'periapical radiograph',
  bitewing: 'bitewing radiograph — shows upper and lower posterior teeth',
  occlusal: 'occlusal radiograph',
}

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
    const imageType_hint = formData.get('imageType') || 'intraoral_photo'

    if (!image || !visitId) {
      return NextResponse.json({ error: 'Image and visitId required' }, { status: 400 })
    }

    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: {
        medicalHistory: true,
        clinicalFindings: true,
        patient: true,
      }
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const rawType = image.type || ''
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const imageMediaType = allowedTypes.includes(rawType) ? rawType : 'image/jpeg'

    const medicalHistory = visit.medicalHistory
    const existingFindings = visit.clinicalFindings?.toothFindings || {}
    const patientAge = visit.patient?.age || 'unknown'
    const patientGender = visit.patient?.gender || 'unknown'
    const imageDescription = IMAGE_TYPE_DESCRIPTIONS[imageType_hint] || 'dental clinical image'

    const contextPrompt = `You are an AI dental assistant with deep clinical knowledge equivalent to a trained dental surgeon specialising in oral medicine, radiology, and preventive dentistry. You are supporting a licensed dentist during clinical examination at a dental clinic in Dehradun, India.

You are analyzing a ${imageDescription}.

## PATIENT CONTEXT
- Age: ${patientAge} years | Gender: ${patientGender}
- Chief complaint: ${medicalHistory?.chiefComplaint || 'Not recorded'}
- Medical conditions: ${(medicalHistory?.conditions || []).join(', ') || 'None'}
- Allergies: ${(medicalHistory?.allergies || []).join(', ') || 'None'}
- Current medications: ${(medicalHistory?.medications || []).join(', ') || 'None'}
- Doctor's clinical notes: ${clinicalNotes || 'None added'}
- Teeth already marked by doctor (do NOT suggest these again): ${Object.keys(existingFindings).length > 0 ? JSON.stringify(existingFindings) : 'None marked yet'}

## IMAGE TYPE INSTRUCTIONS
- You are analyzing a: ${imageDescription}
- For OPG: patient's right side teeth (11–18, 41–48) appear on the LEFT of the image; patient's left side teeth (21–28, 31–38) appear on the RIGHT
- For periapical/bitewing X-rays: note which region is visible and limit findings to those teeth only
- For intraoral photos: note which quadrant or arch is visible
- Use FDI tooth numbering system throughout

## VISUAL EXAMINATION PROTOCOL
Systematically examine ALL of the following that are visible:

TEETH:
- Caries: location, depth appearance (enamel/dentin/pulp involvement), colour changes (white spot lesions, brown/black discolouration)
- Fractures or cracks: crown fractures, craze lines, cusp fractures
- Erosion: acid erosion patterns, wear facets, loss of tooth structure
- Attrition: grinding wear, flattened cusps
- Abrasion: notching at gumline, cervical wear
- Discolouration: intrinsic (grey/dark — pulp necrosis?) vs extrinsic (staining from food, tobacco, poor hygiene)
- Missing teeth: gaps, drifting of adjacent teeth
- Malposition/crowding: rotated, tilted, overlapping teeth
- Restorations: existing fillings, crowns — check for fracture, secondary caries, open margins
- Root exposure: visible root surfaces

GUMS & PERIODONTIUM:
- Gingivitis: redness, swelling, bleeding points, loss of stippling
- Periodontitis: recession, pocket formation signs, bone loss indicators on X-ray
- Gum recession: localised or generalised, root exposure
- Hyperplasia: enlarged gums, overgrowth
- Localised swelling: abscess, cyst signs, fluctuant swelling
- Colour changes: pale (anaemia?), red (inflammation), white patches (leukoplakia?)
- Ulcers or lesions: aphthous, herpetic, traumatic

ORAL MUCOSA & SOFT TISSUE (if visible):
- Lesions, patches, swellings on tongue, cheeks, palate, floor of mouth
- Ulcerations — size, margins
- Pigmentation changes

BITE & OCCLUSION (if visible):
- Deep bite, open bite, crossbite signs
- Midline deviation
- Signs of bruxism

## ANALYSIS INSTRUCTIONS
1. Base findings ONLY on what you actually see — be specific about tooth number and surface
2. Correlate visual findings with the patient's chief complaint and clinical notes
3. If image quality is poor for a specific area, state that clearly rather than guessing
4. Only suggest findings with medium or high confidence
5. Do not suggest findings for teeth already marked by the doctor
6. Calibrate severity honestly: low = monitoring needed, moderate = treatment within weeks, high = urgent within days

## OUTPUT FORMAT
Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks. Just the raw JSON array.

Each finding must follow this exact format:
[
  {
    "tooth": 46,
    "condition": "caries",
    "confidence": "high",
    "severity": "high",
    "reasoning": "Deep brown discolouration on mesial surface of 46 with apparent dentin involvement — correlates with patient complaint of cold sensitivity"
  }
]

Valid conditions: caries, missing, rct, crown, fracture, mobility, sensitivity, periapical, erupting, healthy
Valid confidence values: medium, high
Valid severity values: low, moderate, high

Only include findings with confidence "medium" or "high".
If no findings meet this threshold, return: []`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType,
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