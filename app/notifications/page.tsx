import { AppShell, PageHeader } from "@/components/erp/app-shell";
import { NotificationPageContent } from "@/components/erp/notification-page-content";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotifications(user);
  return (
    <AppShell user={user} unreadCount={notifications.filter((item) => !item.isRead).length}>
      <PageHeader title="مركز الإشعارات" description="كل التنبيهات محفوظة في Firestore حتى عند فشل Push." />
      <NotificationPageContent notifications={notifications} viewerRole={user.role} />
    </AppShell>
  );
}
