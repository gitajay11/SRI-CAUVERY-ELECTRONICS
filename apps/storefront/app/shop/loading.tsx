import { ProductGridSkeleton, Skeleton } from '@/components/ui/Primitives';

/**
 * Streaming placeholder for the shop grid.
 *
 * Deliberately scoped to this segment rather than the app root: a root-level
 * loading.tsx opens a Suspense boundary that flushes the response — and its
 * 200 status — before the page runs, which would make `notFound()` on a
 * product or category page return 200 instead of 404.
 */
export default function Loading() {
  return (
    <div className="container-page py-6 lg:py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading products…</span>
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-8 h-4 w-80 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
