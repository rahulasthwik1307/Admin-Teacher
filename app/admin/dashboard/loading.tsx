export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse">
            <div className="flex items-start gap-4">
              <div className="size-11 rounded-xl bg-muted" />
              <div className="flex flex-col gap-2">
                <div className="h-7 w-12 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-muted mb-4" />
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border">
            <div className="size-8 rounded-full bg-muted" />
            <div className="flex-1 h-4 rounded bg-muted" />
            <div className="w-16 h-3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
