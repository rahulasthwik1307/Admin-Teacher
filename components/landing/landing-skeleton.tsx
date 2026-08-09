export function LandingSkeleton() {
  return (
    <div className="min-h-svh w-full bg-[#F9FAFB] text-[#111827] flex flex-col transition-opacity duration-500 opacity-100">
      
      {/* Header Skeleton */}
      <header className="h-16 w-full border-b border-slate-200/60 bg-white/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl shimmer-effect" />
          <div className="h-5 w-36 rounded-md shimmer-effect" />
        </div>
        <div className="hidden md:flex gap-6">
          <div className="h-4 w-20 rounded-md shimmer-effect" />
          <div className="h-4 w-24 rounded-md shimmer-effect" />
          <div className="h-4 w-20 rounded-md shimmer-effect" />
        </div>
        <div className="h-10 w-24 rounded-xl shimmer-effect" />
      </header>

      {/* Hero Skeleton */}
      <div className="mx-auto max-w-7xl w-full px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="h-7 w-48 rounded-full shimmer-effect" />
          <div className="h-14 w-full max-w-lg rounded-2xl shimmer-effect" />
          <div className="h-6 w-3/4 rounded-lg shimmer-effect" />
          <div className="h-12 w-44 rounded-xl shimmer-effect mt-4" />
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <div className="w-75 h-137.5 rounded-[44px] shimmer-effect" />
        </div>
      </div>

    </div>
  )
}
