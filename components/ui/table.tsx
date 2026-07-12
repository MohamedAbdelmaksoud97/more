import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  children,
  className,
  tableClassName,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", className)}>
      <table className={cn("min-w-full divide-y divide-slate-200 text-sm", tableClassName)}>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 text-right font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
}
