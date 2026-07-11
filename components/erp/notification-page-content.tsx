import Link from "next/link";
import type { NotificationItem, Role } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export function NotificationPageContent({
  notifications,
  viewerRole,
}: {
  notifications: NotificationItem[];
  viewerRole: Role;
}) {
  if (!notifications.length) {
    return <EmptyState title="لا توجد إشعارات" body="ستظهر هنا التنبيهات المهمة عند حدوث أي نشاط في النظام." />;
  }

  return (
    <div className="grid gap-3">
      {notifications.map((item) => (
        <Panel key={item.id}>
          <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-slate-950">{item.title}</h2>
                {!item.isRead ? <Badge tone="yellow">جديد</Badge> : null}
                {item.requiresAction ? <Badge tone="red">يتطلب إجراء</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {item.actorName} - {formatDate(item.createdAt)}
              </p>
            </div>
            {item.relatedEntityType && item.relatedEntityId ? (
              <Link
                className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-blue-700"
                href={`/notifications/open?id=${item.id}&to=${encodeURIComponent(linkFor(item, viewerRole))}`}
              >
                فتح
              </Link>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function linkFor(item: NotificationItem, role: Role) {
  if (item.relatedEntityType === "order") return role === "coordinator" ? `/coordinator/orders/${item.relatedEntityId}` : `/marketer/orders/${item.relatedEntityId}`;
  if (item.relatedEntityType === "product") {
    if (role === "admin") return `/admin/products/${item.relatedEntityId}`;
    if (role === "coordinator") return `/coordinator/products/${item.relatedEntityId}`;
    return `/marketer/products/${item.relatedEntityId}`;
  }
  if (item.relatedEntityType === "user") return "/admin/users";
  if (item.relatedEntityType === "commission") return role === "admin" ? "/admin/commissions" : "/marketer/commissions";
  return role === "admin" ? "/admin/reports" : "/marketer/dashboard";
}
