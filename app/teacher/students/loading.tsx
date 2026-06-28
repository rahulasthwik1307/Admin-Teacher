export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm animate-pulse">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="flex flex-col gap-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-5 w-8 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-pulse">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <div className="size-11 rounded-full bg-muted" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
