import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#f8fbff,#eef4f7)] p-4">
      <section className="w-full max-w-lg rounded-2xl border border-white/80 bg-white p-8 text-center shadow-2xl shadow-blue-900/10">
        <Image
          src="/more-power-more-energy.png"
          alt="MORE Energy"
          width={260}
          height={150}
          className="mx-auto h-auto w-64"
          priority
        />
        <span className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">تم تأكيد البريد بنجاح</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          المدير سيقوم بمراجعة طلب التسجيل وإعطائك الصلاحيات اللازمة. ستتمكن من الدخول للنظام بعد اعتماد الحساب.
        </p>
        <Link className="mt-6 inline-flex h-11 items-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800" href="/login">
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
