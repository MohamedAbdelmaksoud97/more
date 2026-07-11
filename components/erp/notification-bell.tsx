import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const hasUnread = unreadCount > 0;
  return (
    <Link
      href="/notifications"
      className={cn(
        "relative grid size-10 place-items-center rounded-md border transition",
        hasUnread
          ? "border-amber-300 bg-amber-50 text-amber-700 shadow-[0_0_0_4px_rgba(251,191,36,0.18)] hover:bg-amber-100"
          : "border-slate-200 text-slate-600 hover:bg-slate-50",
      )}
      aria-label={hasUnread ? `${unreadCount} إشعارات غير مقروءة` : "الإشعارات"}
      title={hasUnread ? `${unreadCount} إشعارات غير مقروءة` : "الإشعارات"}
    >
      {hasUnread ? <BellRing className="size-5 animate-pulse" /> : <Bell className="size-5" />}
      {hasUnread ? (
        <>
          <span className="absolute inset-0 rounded-md border border-amber-300 opacity-70 animate-ping" />
          <span className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950 ring-2 ring-white">
          {unreadCount}
          </span>
        </>
      ) : null}
    </Link>
  );
}
