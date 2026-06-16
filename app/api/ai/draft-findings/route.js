import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/ai/draft-findings
// Body: { shorthand: string, kind: 'clinical' | 'radiographical' }
//
// Takes a dentist's shorthand notes and expands them into structured
// professional clinical findings text. Push #4 Wave 2B addition.
//
// Design choice (per Dr. Shobhna): NO contextual data sent. The drafter
// only sees the shorthand text. The doctor's findings are authoritative;
// AI just helps with phrasing. This keeps the model stateless, the prompt
// short, and the cost low (~$0.001/draft on Haiku).
//
// The response is plain text — no JSON wrapper, no markdown. The UI shows
// it in a panel below the textarea with Use/Discard buttons.

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CLINICAL_SYSTEM = `You are a dental clinical-notes drafter. The dentist writes shorthand findings; you expand them into professional clinical notes.

Rules:
- Output ONLY the expanded findings text. No preamble like "Here is", "Sure", "Expanded notes:". No closing remarks. No markdown.
- Use standard dental terminology and full sentences.
- Use FDI tooth numbering as written by the dentist. Don't reinterpret.
- Stay faithful to the shorthand. Do NOT invent findings the dentist didn't write.
- If shorthand mentions a tooth + condition (e.g. "caries 14"), expand to a clinical sentence ("Carious lesion noted on tooth 14, involving the occlusal surface" — but only mention surface/depth IF the dentist wrote it).
- Keep it concise. 1-4 sentences typically. Don't pad with generic boilerplate.
- If the input is empty or contains no clinical content, return the input unchanged.`

const RADIOGRAPHICAL_SYSTEM = `You are a dental radiographical-notes drafter. The dentist writes shorthand findings from reading an X-ray; you expand them into professional radiographical notes.

Rules:
- Output ONLY the expanded findings text. No preamble. No markdown.
- Use standard radiographical terminology and full sentences.
- Use FDI tooth numbering as written by the dentist. Don't reinterpret.
- Stay faithful to the shorthand. Do NOT invent findings the dentist didn't write.
- Keep it concise. 1-4 sentences typically. Don't pad with generic boilerplate.
- Common patterns: "periapical radiolucency on 14" → "Periapical radiolucency observed on tooth 14, suggestive of periapical pathology." Stay close to the dentist's intent.
- If the input is empty or contains no clinical content, return the input unchanged.`

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(function() { return {} })
    const shorthand = typeof body.shorthand === 'string' ? body.shorthand.trim() : ''
    const kind = body.kind === 'radiographical' ? 'radiographical' : 'clinical'

    if (!shorthand) {
      return NextResponse.json({ error: 'Shorthand text is empty — nothing to draft' }, { status: 400 })
    }
    if (shorthand.length > 2000) {
      return NextResponse.json({ error: 'Shorthand too long (max 2000 characters)' }, { status: 400 })
    }

    const systemPrompt = kind === 'radiographical' ? RADIOGRAPHICAL_SYSTEM : CLINICAL_SYSTEM

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: 'Shorthand:\n\n' + shorthand,
      }],
    })

    // Extract plain text from the response (first text content block)
    const textBlock = (completion.content || []).find(function(c) { return c.type === 'text' })
    const drafted = textBlock ? String(textBlock.text || '').trim() : ''

    if (!drafted) {
      return NextResponse.json({ error: 'AI returned an empty draft. Try again or expand the shorthand.' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      drafted,
      kind,
    })

  } catch (err) {
    console.error('AI draft-findings failed:', err)
    return NextResponse.json({
      error: 'Failed to draft findings',
      detail: String(err.message || err),
    }, { status: 500 })
  }
}
