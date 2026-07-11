import { AppShell } from "@/components/erp/app-shell";
import { requireRole } from "@/lib/auth";
import { listNotifications } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["marketer", "admin"]);
  const notifications = await listNotifications(user);
  return <AppShell user={user} unreadCount={notifications.filter((item) => !item.isRead).length}>{children}</AppShell>;
}
