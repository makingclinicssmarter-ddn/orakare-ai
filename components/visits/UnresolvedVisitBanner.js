import Link from 'next/link'

// Force-resolve banner shown on the patient Records page when a visit was
// created but never closed properly via the new Close-visit screen.
//
// Inputs: an array of visit-lite objects { id, status, createdAt }
// Behavior:
//   - 0 visits → renders nothing
//   - 1+ visits → renders the banner, linking to each unresolved visit's
//     Close screen
//
// We never auto-resolve. Dr. Shobhna decides what each visit's outcome was.

const IST = 'Asia/Kolkata'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: IST,
  })
}

export default function UnresolvedVisitBanner({ patientId, unresolvedVisits }) {
  if (!unresolvedVisits || unresolvedVisits.length === 0) return null

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-900">
            {unresolvedVisits.length === 1
              ? '1 visit needs to be closed'
              : unresolvedVisits.length + ' visits need to be closed'}
          </div>
          <div className="text-xs text-amber-800 mt-1">
            These visits were started but never properly closed. Close each one
            to record what happened (advised / consented / treated), charges, and any
            advice given.
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {unresolvedVisits.map(function(v) {
          return (
            <li key={v.id} className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-md px-3 py-2">
              <div className="text-xs text-slate-700">
                Visit started {formatDate(v.createdAt)}
                <span className="text-slate-400"> · {v.status.replace(/_/g, ' ').toLowerCase()}</span>
              </div>
              <Link
                href={'/dashboard/consultation/' + patientId + '/' + v.id + '/close'}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium"
              >
                Close visit →
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
