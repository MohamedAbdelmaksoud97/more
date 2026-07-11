"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        compact
          ? "rounded-lg px-2 py-2 text-center text-xs font-black transition"
          : "rounded-xl px-3 py-2.5 text-sm font-bold transition",
        isActive
          ? "bg-blue-700 text-white shadow-sm shadow-blue-900/20"
          : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
      )}
    >
      {label}
    </Link>
  );
}
