import { cn, formatCurrency } from "@/lib/utils";

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-bold text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DashboardCard({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "blue" | "green" | "yellow" | "gray";
}) {
  const accents = {
    blue: "border-r-blue-600",
    green: "border-r-emerald-600",
    yellow: "border-r-amber-500",
    gray: "border-r-slate-400",
  };
  return (
    <div className={cn("rounded-lg border border-slate-200 border-r-4 bg-white p-4 shadow-sm", accents[tone])}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(value)}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-36 animate-pulse rounded-lg bg-slate-100" />;
}
