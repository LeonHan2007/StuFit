import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-7">
        <Skeleton className="h-9 w-48" />
      </div>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 pb-32">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </main>
    </>
  );
}
