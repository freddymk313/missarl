export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl animate-pulse">
      {/* Header skeleton */}
      <div className="h-28 rounded-2xl bg-card border border-border p-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded-md bg-secondary" />
          <div className="h-6 w-56 rounded-md bg-secondary" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-secondary" />
          <div className="h-9 w-24 rounded-xl bg-secondary" />
        </div>
      </div>

      {/* 4 KPI tiles skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 rounded bg-secondary" />
              <div className="size-8 rounded-lg bg-secondary" />
            </div>
            <div className="h-7 w-24 rounded bg-secondary" />
            <div className="h-3 w-36 rounded bg-secondary" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="h-96 rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-44 rounded bg-secondary" />
          <div className="h-4 w-20 rounded bg-secondary" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full rounded-xl bg-secondary/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
