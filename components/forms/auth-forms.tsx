"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MailCheck, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { COMPANY } from "@/lib/constants";
import { getFirebaseAuth } from "@/lib/firebase/client";

function getErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function friendlyAuthError(error: unknown) {
  const code = getErrorCode(error);
  if (code.includes("operation-not-allowed")) return "يجب تفعيل Email/Password من Firebase Authentication أولا.";
  if (code.includes("email-already-in-use")) return "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.";
  if (code.includes("weak-password")) return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.";
  if (code.includes("invalid-email")) return "البريد الإلكتروني غير صحيح.";
  if (code.includes("invalid-credential")) return "البريد أو كلمة المرور غير صحيحين.";
  if (error instanceof Error && error.message) return error.message;
  return "حدث خطأ غير معروف";
}

function getEmailActionUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = configuredUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/$/, "")}/login`;
}

function friendlyVerificationError(error: unknown) {
  const code = getErrorCode(error);
  if (code.includes("unauthorized-continue-uri") || code.includes("unauthorized-domain")) {
    return "تعذر إرسال رابط التأكيد لأن دومين الموقع غير مضاف في Firebase Authentication. أضف more-mocha.vercel.app في Authorized domains.";
  }
  if (code.includes("too-many-requests")) {
    return "تم إرسال روابط كثيرة خلال وقت قصير. انتظر قليلا ثم جرّب إعادة الإرسال.";
  }
  if (code.includes("missing-continue-uri")) {
    return "رابط الرجوع بعد تأكيد البريد غير مضبوط. راجع NEXT_PUBLIC_APP_URL.";
  }
  return friendlyAuthError(error);
}

async function sendVerificationEmail(user: Parameters<typeof sendEmailVerification>[0]) {
  await sendEmailVerification(user, {
    url: getEmailActionUrl(),
    handleCodeInApp: false,
  });
}

async function syncEmailVerification(idToken: string) {
  const response = await fetch("/api/auth/sync-email-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return response.json().catch(() => ({}));
}

async function createSession(idToken: string) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

function dashboardForRole(role?: string) {
  if (role === "coordinator") return "/coordinator/dashboard";
  if (role === "marketer") return "/marketer/dashboard";
  return "/admin/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase غير مهيأ حاليا.");
      setLoading(false);
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, String(form.get("email")), String(form.get("password")));
      await credential.user.reload();
      const token = await credential.user.getIdToken(true);

      if (!credential.user.emailVerified) {
        const { response, result } = await createSession(token);
        if (response.ok) {
          router.push(dashboardForRole(result.role));
          router.refresh();
          return;
        }
        if (result.status === "PENDING_EMAIL_VERIFICATION") {
          await sendVerificationEmail(credential.user);
          await syncEmailVerification(token);
          router.push("/verify-email");
          return;
        }
        throw new Error(result.error ?? "تعذر إنشاء الجلسة");
      }

      const sync = await syncEmailVerification(token);
      if (sync.status === "PENDING_ADMIN_APPROVAL") {
        router.push("/pending-approval");
        return;
      }

      const { response, result } = await createSession(token);
      if (!response.ok) {
        if (result.status === "PENDING_EMAIL_VERIFICATION") router.push("/verify-email");
        else if (result.status === "PENDING_ADMIN_APPROVAL") router.push("/pending-approval");
        else throw new Error(result.error ?? "تعذر إنشاء الجلسة");
        return;
      }
      router.push(dashboardForRole(result.role));
      router.refresh();
    } catch (error) {
      setError(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return <AuthCard title="تسجيل الدخول" onSubmit={submit} loading={loading} error={error} submitLabel="دخول" />;
}

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);

  async function uploadRegistrationFile(file: File, idToken: string) {
    if (!file.type.match(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/)) {
      throw new Error("يسمح برفع صورة أو PDF فقط لمستندات التسجيل.");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("حجم الملف لا يجب أن يتجاوز 20 ميجابايت.");
    }
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/upload/registration", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "تعذر رفع مستند التسجيل");
    return String(result.url);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase غير مهيأ حاليا. أضف متغيرات البيئة أولا.");
      setLoading(false);
      return;
    }

    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      address: form.get("address"),
      email: form.get("email"),
      password: form.get("password"),
    };

    try {
      if (!nationalIdFile || !addressProofFile) {
        throw new Error("ارفع صورة البطاقة وصورة إثبات العنوان قبل التسجيل.");
      }
      const credential = await createUserWithEmailAndPassword(auth, String(payload.email), String(payload.password));
      await updateProfile(credential.user, { displayName: String(payload.name) });
      await sendVerificationEmail(credential.user);
      const token = await credential.user.getIdToken(true);
      const [nationalIdImageUrl, addressProofImageUrl] = await Promise.all([
        uploadRegistrationFile(nationalIdFile, token),
        uploadRegistrationFile(addressProofFile, token),
      ]);
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, ...payload, nationalIdImageUrl, addressProofImageUrl }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "تعذر تسجيل الحساب");
      router.push(result.status === "APPROVED" ? "/login" : "/verify-email");
    } catch (error) {
      const code = getErrorCode(error);
      if (code.includes("operation-not-allowed")) {
        setError("فعّل Email/Password من Firebase Authentication حتى يتم إرسال رابط تأكيد البريد.");
      } else {
        setError(friendlyVerificationError(error));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="إنشاء حساب جديد"
      onSubmit={submit}
      loading={loading}
      error={error}
      submitLabel="إرسال رابط التأكيد"
      register
      registrationDocs={
        <div className="grid gap-3">
          <RegistrationFileField
            label="صورة البطاقة"
            file={nationalIdFile}
            onFile={setNationalIdFile}
            onClear={() => setNationalIdFile(null)}
          />
          <RegistrationFileField
            label="إثبات العنوان"
            file={addressProofFile}
            onFile={setAddressProofFile}
            onClear={() => setAddressProofFile(null)}
          />
        </div>
      }
    />
  );
}

function AuthCard({
  title,
  onSubmit,
  loading,
  error,
  submitLabel,
  register,
  registrationDocs,
}: {
  title: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string;
  submitLabel: string;
  register?: boolean;
  registrationDocs?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,#dff3ff,transparent_36%),linear-gradient(135deg,#f8fbff,#eef4f7)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <Image
              src="/more-power-more-energy-transparent.png"
              alt="MORE Energy"
              width={360}
              height={220}
              priority
              className="h-auto w-80"
            />
            <h1 className="mt-8 text-4xl font-black leading-tight text-slate-950">
              نظام إدارة احترافي لمبيعات الطاقة والبطاريات
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              متابعة الطلبات، المخزون، الشحن، التحصيل، العمولات، والأهداف من واجهة عربية آمنة ومتجاوبة.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {["اعتماد آمن", "مخزون دقيق", "تقارير فورية"].map((item) => (
                <div key={item} className="rounded-lg border border-white/70 bg-white/70 p-4 text-center text-sm font-bold text-blue-800 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} className="rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur">
          <div className="mb-6 text-center">
            <Image
              src="/more-power-more-energy.png"
              alt={COMPANY.enName}
              width={230}
              height={130}
              priority
              className="mx-auto h-auto w-56"
            />
            <h2 className="mt-5 text-2xl font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{COMPANY.arName}</p>
          </div>
          <div className="grid gap-4">
            {register ? (
              <>
                <Field label="الاسم">
                  <Input name="name" required minLength={2} />
                </Field>
                <Field label="الهاتف">
                  <Input name="phone" required inputMode="numeric" pattern="[0-9]{8,20}" placeholder="01000000000" />
                </Field>
                <Field label="العنوان">
                  <Input name="address" required minLength={5} dir="rtl" placeholder="العنوان باللغة العربية" />
                </Field>
                {registrationDocs}
              </>
            ) : null}
            <Field label="البريد الإلكتروني">
              <Input name="email" type="email" required />
            </Field>
            <Field label="كلمة المرور">
              <Input name="password" type="password" required minLength={8} />
            </Field>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">{error}</p> : null}
            <Button loading={loading} type="submit" className="h-11">
              {submitLabel}
              <ArrowLeft className="size-4" />
            </Button>
            {!register ? (
              <Link href="/forgot-password" className="text-center text-sm font-bold text-blue-700 hover:underline">
                نسيت كلمة المرور؟
              </Link>
            ) : null}
            {register ? (
              <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                <MailCheck className="ml-1 inline size-4" />
                بعد التسجيل سيصلك رابط تأكيد على البريد، وبعد التأكيد سيراجع المدير طلبك ويحدد الصلاحيات.
              </p>
            ) : null}
          </div>
          <div className="mt-5 text-center text-sm font-semibold text-slate-600">
            {register ? (
              <>لديك حساب؟ <Link className="text-blue-700" href="/login">تسجيل الدخول</Link></>
            ) : (
              <>ليس لديك حساب؟ <Link className="text-blue-700" href="/register">إنشاء حساب</Link></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function RegistrationFileField({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">صورة واضحة أو ملف PDF.</p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800">
          <UploadCloud className="size-4" />
          اختيار
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={(event) => {
              const selectedFile = event.currentTarget.files?.[0];
              if (selectedFile) onFile(selectedFile);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {file ? (
        <div className="mt-3 flex items-center justify-between rounded-md border border-emerald-200 bg-white p-2 text-xs font-bold text-emerald-700">
          <span className="inline-flex min-w-0 items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="truncate">{file.name}</span>
          </span>
          <button type="button" onClick={onClear} className="grid size-7 place-items-center rounded-full text-red-600 hover:bg-red-50">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
