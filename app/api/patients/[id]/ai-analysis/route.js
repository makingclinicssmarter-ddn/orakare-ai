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
  bitewing: 'bitewing radiograph — shows upper and lower posterior teeth on both jaws',
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
    const visitId = formData.get('visitId')
    const symptomsRaw = formData.get('symptoms') || '{}'
    const imageMetaRaw = formData.get('imageMeta') || '[]'

    if (!visitId) {
      return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    }

    let symptoms = {}
    let imageMeta = []
    try {
      symptoms = JSON.parse(symptomsRaw)
      imageMeta = JSON.parse(imageMetaRaw)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON in symptoms or imageMeta' }, { status: 400 })
    }

    // Build image content blocks
    const imageContentBlocks = []
    for (const meta of imageMeta) {
      const file = formData.get('image_' + meta.index)
      if (!file) continue
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const rawType = file.type || ''
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const mediaType = allowedTypes.includes(rawType) ? rawType : 'image/jpeg'
      const description = IMAGE_TYPE_DESCRIPTIONS[meta.imageType] || 'dental clinical image'
      const regionNote = meta.region ? `Doctor indicates the following teeth/region are visible: ${meta.region}` : 'Region not specified — identify visible teeth from the image'

      imageContentBlocks.push({
        type: 'text',
        text: `--- IMAGE ${meta.index + 1} ---\nType: ${description}\n${regionNote}`,
      })
      imageContentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      })
    }

    if (imageContentBlocks.length === 0) {
      return NextResponse.json({ error: 'No valid images provided' }, { status: 400 })
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

    const medicalHistory = visit.medicalHistory
    const existingFindings = visit.clinicalFindings?.toothFindings || {}
    const patientAge = visit.patient?.age || 'unknown'
    const patientGender = visit.patient?.gender || 'unknown'

    // Build symptom context
    const symptomLines = []
    if (symptoms.location) symptomLines.push(`- Area of concern: ${symptoms.location}`)
    if (symptoms.duration) symptomLines.push(`- Duration: ${symptoms.duration}`)
    if (symptoms.painType) symptomLines.push(`- Pain/discomfort type: ${symptoms.painType}`)
    if (symptoms.trigger) symptomLines.push(`- Aggravating factors: ${symptoms.trigger}`)
    if (symptoms.swelling) symptomLines.push(`- Swelling or discharge: ${symptoms.swelling}`)
    const symptomContext = symptomLines.length > 0 ? symptomLines.join('\n') : 'No symptoms recorded'

    const systemPrompt = `You are an AI dental assistant with deep clinical knowledge equivalent to a trained dental surgeon specialising in oral medicine, radiology, and preventive dentistry. You are supporting a licensed dentist during clinical examination at a dental clinic in Dehradun, India.

You will be provided with ${imageMeta.length} dental image(s). Each image is labelled with its type and the teeth/region the doctor indicates are visible.

## PATIENT CONTEXT
- Age: ${patientAge} years | Gender: ${patientGender}
- Chief complaint: ${medicalHistory?.chiefComplaint || 'Not recorded'}
- Medical conditions: ${(medicalHistory?.conditions || []).join(', ') || 'None'}
- Allergies: ${(medicalHistory?.allergies || []).join(', ') || 'None'}
- Current medications: ${(medicalHistory?.medications || []).join(', ') || 'None'}

## PATIENT SYMPTOMS
${symptomContext}

## TEETH ALREADY MARKED BY DOCTOR
Do NOT suggest findings for these teeth — they are already confirmed:
${Object.keys(existingFindings).length > 0 ? JSON.stringify(existingFindings) : 'None marked yet'}

## IMAGE ANALYSIS INSTRUCTIONS
- Use FDI tooth numbering system throughout
- For each image, analyse only the teeth the doctor has indicated are present. If no region is specified, identify visible teeth yourself but be conservative
- Cross-reference findings across multiple images — if the same tooth appears in more than one image, combine findings from both views before concluding
- For OPG: patient's right side teeth (11–18, 41–48) appear on the LEFT of the image
- For periapical/bitewing: limit findings to the teeth visible in that specific image
- For intraoral photos: note which quadrant or surface is visible

## VISUAL EXAMINATION PROTOCOL
Systematically examine ALL of the following that are visible:

TEETH:
- Caries: location, depth (enamel/dentin/pulp involvement), colour changes (white spot, brown/black discolouration)
- Fractures or cracks: crown fractures, craze lines, cusp fractures
- Erosion: acid erosion patterns, wear facets
- Attrition: grinding wear, flattened cusps
- Abrasion: notching at gumline, cervical wear
- Discolouration: intrinsic (grey/dark — pulp necrosis?) vs extrinsic (staining)
- Missing teeth: gaps, drifting of adjacent teeth
- Malposition/crowding: rotated, tilted, overlapping
- Restorations: fillings, crowns — check for fracture, secondary caries, open margins
- Root exposure: visible root surfaces

GUMS & PERIODONTIUM:
- Gingivitis: redness, swelling, loss of stippling
- Periodontitis: recession, bone loss on X-ray
- Localised swelling: abscess, cyst signs
- White patches, ulcers, colour changes

BITE & OCCLUSION (if visible):
- Deep bite, open bite, crossbite, midline deviation, bruxism signs

## ANALYSIS RULES
1. Base findings ONLY on what you actually see — be specific about tooth number and surface
2. Correlate findings with patient symptoms — note when a finding directly explains the complaint
3. If image quality is poor for a specific area, skip that area rather than guessing
4. Only report findings with medium or high confidence
5. Do not suggest findings for teeth already marked by the doctor
6. Severity: low = monitoring, moderate = treat within weeks, high = urgent within days

## OUTPUT
Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks.

[
  {
    "tooth": 46,
    "condition": "caries",
    "surface": "mesial",
    "confidence": "high",
    "severity": "high",
    "differential": ["irreversible pulpitis", "deep dentinal caries"],
    "reasoning": "Deep brown radiolucency on mesial surface of 46 with apparent pulp proximity — correlates with patient's spontaneous throbbing pain worsening at night",
    "recommendedNext": "Pulp vitality test before confirming RCT",
    "imageRef": 1
  }
]

Valid conditions: caries, missing, rct, crown, fracture, mobility, sensitivity, periapical, erupting, healthy
Valid confidence: medium, high
Valid severity: low, moderate, high
imageRef: which image number (1-based) the finding was identified in

Only include findings with confidence medium or high. If none meet threshold, return: []`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: imageContentBlocks,
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
      },
      create: {
        visitId,
        aiSuggestions: suggestions,
        clinicalNotes: '',
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