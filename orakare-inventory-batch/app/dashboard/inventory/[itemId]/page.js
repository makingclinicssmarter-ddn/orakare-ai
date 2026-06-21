import ItemDetailView from '@/components/inventory/ItemDetailView'

export const dynamic = 'force-dynamic'

export default async function ItemDetailPage(props) {
  const params = await props.params
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ItemDetailView itemId={params.itemId} />
    </div>
  )
}
