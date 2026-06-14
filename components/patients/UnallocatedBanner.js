'use client'
import { useState } from 'react'
import ApplyUnallocatedModal from './ApplyUnallocatedModal'

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function UnallocatedBanner({ unallocatedTotal, unallocatedReceipts, activeTreatments, patientId }) {
  const [open, setOpen] = useState(false)

  if (unallocatedTotal <= 0) return null

  const canApply = activeTreatments && activeTreatments.length > 0

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium text-amber-900">Unallocated payment: {formatINR(unallocatedTotal)}</div>
            <div className="text-xs text-amber-800 mt-0.5">
              Patient paid this without specifying which treatment. {canApply ? 'Apply it to a treatment now, or leave it parked.' : 'No active treatments to allocate to yet.'}
            </div>
          </div>
          {canApply && (
            <button
              onClick={function() { setOpen(true) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium whitespace-nowrap"
            >
              Apply unallocated →
            </button>
          )}
        </div>
      </div>

      <ApplyUnallocatedModal
        open={open}
        onClose={function() { setOpen(false) }}
        receipts={unallocatedReceipts}
        activeTreatments={activeTreatments}
        patientId={patientId}
      />
    </>
  )
}
