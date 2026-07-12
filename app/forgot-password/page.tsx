import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/password-forms";
import { COMPANY } from "@/lib/constants";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,#dff3ff,transparent_36%),linear-gradient(135deg,#f8fbff,#eef4f7)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-md content-center gap-6">
        <div className="text-center">
          <Image
            src="/more-power-more-energy.png"
            alt={COMPANY.enName}
            width={230}
            height={130}
            priority
            className="mx-auto h-auto w-56"
          />
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm font-bold text-slate-600">
          تذكرت كلمة المرور؟{" "}
          <Link href="/login" className="text-blue-700 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
