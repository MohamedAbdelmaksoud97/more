import { AppShell, PageHeader } from "@/components/erp/app-shell";
import { NotificationPageContent } from "@/components/erp/notification-page-content";
import { requireUser } from "@/lib/auth";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  await markNotificationsRead(user);
  const notifications = await listNotifications(user);
  return (
    <AppShell user={user} unreadCount={0}>
      <PageHeader title="مركز الإشعارات" />
      <NotificationPageContent
        notifications={notifications}
        viewerRole={user.role}
      />
    </AppShell>
  );
}
