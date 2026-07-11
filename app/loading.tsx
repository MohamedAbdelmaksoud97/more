import { SkeletonCard } from "@/components/ui/cards";

export default function Loading() {
  return (
    <div className="grid min-h-screen gap-4 bg-slate-100 p-6 md:grid-cols-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
