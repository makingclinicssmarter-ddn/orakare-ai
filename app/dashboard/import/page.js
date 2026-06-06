import PatientImport from '@/components/import/PatientImport'
import TreatmentImport from '@/components/import/TreatmentImport'

export default function ImportPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Import data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Migrate your existing data from Google Sheets
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
            Import patients
          </h2>
          <PatientImport />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
            Import treatments
          </h2>
          <TreatmentImport />
        </div>
      </div>
    </div>
  )
}