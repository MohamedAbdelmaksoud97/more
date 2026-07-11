import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone =
    status.includes("COMPLETED") || status.includes("APPROVED") || status.includes("PAID")
      ? "green"
      : status.includes("REJECTED") || status.includes("FAILED") || status.includes("CANCELLED")
        ? "red"
        : status.includes("PENDING") || status.includes("REVIEW")
          ? "yellow"
          : "blue";
  return <Badge tone={tone}>{label}</Badge>;
}
