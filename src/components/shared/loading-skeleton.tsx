import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm" role="status" aria-busy="true" aria-label="Loading card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm" role="status" aria-busy="true" aria-label="Loading table">
      {/* Table header */}
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-6 py-4",
            i < rows - 1 && "border-b"
          )}
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm" role="status" aria-busy="true" aria-label="Loading chart">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${[100, 60, 140, 80, 120, 50, 130, 70, 110, 90, 150, 65][i]}px` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

export { Skeleton };
