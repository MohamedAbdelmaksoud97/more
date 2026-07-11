"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="max-w-md rounded-lg border border-red-100 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black text-slate-950">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-slate-500">جرّب إعادة تحميل الصفحة أو الرجوع للوحة التحكم.</p>
        <Button className="mt-5" onClick={reset}>إعادة المحاولة</Button>
      </div>
    </div>
  );
}
