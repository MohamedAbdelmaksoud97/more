"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteUserAction } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteUserButton({ uid, name }: { uid: string; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      title="تأكيد حذف المستخدم"
      body={`سيتم حذف حساب ${name} من تسجيل الدخول وقاعدة البيانات وبيانات الإشعارات المرتبطة به. لا يمكن التراجع عن هذه العملية.`}
      confirmLabel="حذف المستخدم"
      action={async () => {
        const result = await deleteUserAction(uid);
        if (!result.ok) {
          window.alert(result.message);
          return;
        }
        router.refresh();
      }}
    >
      <Button type="button" variant="secondary" className="h-9 border-slate-300 bg-slate-100 px-3 text-xs text-slate-700 hover:bg-slate-200">
        <Trash2 className="size-3.5" />
        حذف
      </Button>
    </ConfirmDialog>
  );
}
