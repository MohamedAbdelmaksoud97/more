import { PageHeader } from "@/components/erp/app-shell";
import { Panel } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { hasCloudinaryConfig } from "@/lib/cloudinary";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  return (
    <>
      <PageHeader title="الإعدادات" description="حالة التكاملات ومتغيرات البيئة المطلوبة." />
      <Panel title="حالة الربط">
        <div className="grid gap-3 text-sm font-semibold text-slate-700">
          <p>Firebase Admin: {hasFirebaseAdminConfig() ? "مهيأ" : "غير مهيأ"}</p>
          <p>Cloudinary: {hasCloudinaryConfig() ? "مهيأ" : "غير مهيأ"}</p>
          <p>لا يتم حفظ أي أسرار داخل الكود. استخدم ملف .env.local أو إعدادات الاستضافة.</p>
        </div>
      </Panel>
    </>
  );
}
