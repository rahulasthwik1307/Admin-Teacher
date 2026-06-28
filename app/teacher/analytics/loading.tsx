export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm animate-pulse">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="flex flex-col gap-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-4 w-10 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted mb-4" />
            <div className="flex justify-center my-4">
              <div className="size-24 rounded-full bg-muted" />
            </div>
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
