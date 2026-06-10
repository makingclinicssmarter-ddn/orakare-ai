import { createClient } from '@supabase/supabase-js'

// Server-side admin client uses the service role key — bypasses RLS.
// MUST never be imported into client components or exposed to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

const BUCKET = 'clinical-images'

function extFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function randomToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

/**
 * Upload a clinical image (Buffer) to private storage.
 * Returns the descriptor to persist in ClinicalFindings.images.
 *
 * @param {object} params
 * @param {string} params.clinicId
 * @param {string} params.visitId
 * @param {Buffer} params.buffer
 * @param {string} params.mimeType
 */
export async function uploadClinicalImage({ clinicId, visitId, buffer, mimeType }) {
  if (!clinicId || !visitId) throw new Error('uploadClinicalImage: clinicId and visitId required')

  const ext = extFromMime(mimeType)
  const filename = Date.now() + '-' + randomToken() + '.' + ext
  const path = 'clinics/' + clinicId + '/visits/' + visitId + '/' + filename

  const { error } = await supabaseAdmin
    .storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw new Error('Storage upload failed: ' + error.message)
  return {
    path,
    bucket: BUCKET,
    mimeType,
    uploadedAt: new Date().toISOString(),
  }
}

/**
 * Generate a short-lived signed URL for viewing a clinical image.
 * Default expiry: 1 hour. Never persist signed URLs — always re-sign on demand.
 */
export async function getSignedImageUrl(path, expiresInSeconds = 3600) {
  if (!path) throw new Error('getSignedImageUrl: path required')

  const { data, error } = await supabaseAdmin
    .storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error) throw new Error('Signed URL failed: ' + error.message)
  return data.signedUrl
}

/**
 * Sign a batch of image paths in parallel.
 * Useful for visit-summary or examination-history views.
 */
export async function getSignedImageUrls(paths, expiresInSeconds = 3600) {
  if (!Array.isArray(paths) || paths.length === 0) return []
  return Promise.all(paths.map((p) => getSignedImageUrl(p, expiresInSeconds)))
}
