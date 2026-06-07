import PatientImport from '@/components/import/PatientImport'
import TreatmentImport from '@/components/import/TreatmentImport'
import SittingImport from '@/components/import/SittingImport'
import InvoiceImport from '@/components/import/InvoiceImport'
import ExpenseImport from '@/components/import/ExpenseImport'
import InventoryImport from '@/components/import/InventoryImport'
import ConsultantImport from '@/components/import/ConsultantImport'

const STEPS = [
  { num: 1, label: 'Patients', component: PatientImport },
  { num: 2, label: 'Treatments', component: TreatmentImport },
  { num: 3, label: 'Sittings', component: SittingImport },
  { num: 4, label: 'Invoices', component: InvoiceImport },
  { num: 5, label: 'Expenses', component: ExpenseImport },
  { num: 6, label: 'Inventory', component: InventoryImport },
  { num: 7, label: 'Consultants', component: ConsultantImport },
]

export default function ImportPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Import data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Migrate all your data from Google Sheets — import in order
        </p>
      </div>

      <div className="space-y-6">
        {STEPS.map(function(step) {
          const Component = step.component
          return (
            <div key={step.num} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {step.num}
                </span>
                Import {step.label}
              </h2>
              <Component />
            </div>
          )
        })}
      </div>
    </div>
  )
}