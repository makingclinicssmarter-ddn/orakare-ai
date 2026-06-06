import PatientImport from '@/components/import/PatientImport'

export default function ImportPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Import patients</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import your existing patient data from Google Sheets or Excel
        </p>
      </div>
      <PatientImport />
    </div>
  )
}