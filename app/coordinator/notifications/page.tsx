import { PageHeader } from "@/components/erp/app-shell";
import { NotificationPageContent } from "@/components/erp/notification-page-content";
import { requireRole } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/data/repository";

export default async function CoordinatorNotificationsPage() {
  const user = await requireRole(["coordinator", "admin"]);
  await markNotificationsRead(user);
  const notifications = await listNotifications(user);
  return (
    <>
      <PageHeader title="إشعارات العمليات" description="طلبات تحتاج مراجعة أو شحن أو تحصيل أو رجوع." />
      <NotificationPageContent notifications={notifications} viewerRole={user.role} />
    </>
  );
}
