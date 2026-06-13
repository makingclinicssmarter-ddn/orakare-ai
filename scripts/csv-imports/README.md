# CSV imports folder

Drop the 7 Google Sheets export CSVs in this folder before running the importer.

Required filenames (exactly, case-sensitive):
- `Patients.csv`
- `Treatments.csv`
- `Sittings.csv`
- `Invoices.csv`
- `Inventory.csv`
- `Expenses.csv`
- `Consultants.csv`

If `Receipts.csv` is also exported, the importer will ignore it — historical
payments are imported via the `Paid` column on `Sittings.csv`.

This folder is `.gitignored` (see `.gitignore` at repo root) — the CSVs contain
patient PII and should never be committed.
