import { PageHeader } from "@/components/erp/app-shell";
import { NotificationPageContent } from "@/components/erp/notification-page-content";
import { requireRole } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/data/repository";

export default async function AdminNotificationsPage() {
  const user = await requireRole(["admin"]);
  await markNotificationsRead(user);
  const notifications = await listNotifications(user);
  return (
    <>
      <PageHeader title="إشعارات المدير" description="كل الأحداث المهمة في النظام." />
      <NotificationPageContent notifications={notifications} viewerRole={user.role} />
    </>
  );
}
