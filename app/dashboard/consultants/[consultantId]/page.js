import ConsultantDetailView from '@/components/consultants/ConsultantDetailView'

export const dynamic = 'force-dynamic'

export default async function ConsultantDetailPage(props) {
  const params = await props.params
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ConsultantDetailView consultantId={params.consultantId} />
    </div>
  )
}
