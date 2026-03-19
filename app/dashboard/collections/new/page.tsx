import { CreateCollectionForm } from './create-form'

export default function NewCollectionPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Collection</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bundle related skills into a curated collection
        </p>
      </div>
      <CreateCollectionForm />
    </div>
  )
}
