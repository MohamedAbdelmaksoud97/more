import { PageHeader } from "@/components/erp/app-shell";
import { NotificationPageContent } from "@/components/erp/notification-page-content";
import { requireRole } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/data/repository";

export default async function MarketerNotificationsPage() {
  const user = await requireRole(["marketer", "admin"]);
  await markNotificationsRead(user);
  const notifications = await listNotifications(user);
  return (
    <>
      <PageHeader title="إشعاراتي" description="تنبيهات الطلبات والعمولات والهدف والخصومات." />
      <NotificationPageContent notifications={notifications} viewerRole={user.role} />
    </>
  );
}
