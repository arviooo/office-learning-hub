export function PageLoadingSkeleton() {
  return (
    <div className="min-h-dvh bg-[#fafaf7] lg:flex" aria-busy="true" aria-label="Memuat halaman">
      {/* Sidebar skeleton (desktop) */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-7 space-y-2.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 w-full animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </aside>

      {/* Main skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 border-b border-slate-200 bg-white px-6 py-4">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-36 w-full animate-pulse rounded-[28px] bg-slate-200/70" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200/70" />
            ))}
          </div>
          <div className="h-72 w-full animate-pulse rounded-3xl bg-white ring-1 ring-slate-200/70" />
        </div>
      </div>
    </div>
  );
}
