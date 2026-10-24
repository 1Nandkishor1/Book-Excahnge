export function BookGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[3/4] animate-pulse rounded-md bg-rule" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-rule" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-rule" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 4 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <div className="h-16 w-12 animate-pulse rounded bg-rule" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-rule" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-rule" />
          </div>
        </div>
      ))}
    </div>
  );
}
