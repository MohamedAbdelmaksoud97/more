"use client";

import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { getFirebaseAuth } from "@/lib/firebase/client";

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-email")) return "البريد الإلكتروني غير صحيح.";
  if (code.includes("user-not-found")) return "لا يوجد حساب بهذا البريد.";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "كلمة المرور الحالية غير صحيحة.";
  if (code.includes("weak-password")) return "كلمة المرور الجديدة ضعيفة. استخدم 8 أحرف على الأقل.";
  if (code.includes("too-many-requests")) return "محاولات كثيرة. جرّب مرة أخرى بعد قليل.";
  if (code.includes("requires-recent-login")) return "سجل الخروج ثم ادخل مرة أخرى قبل تغيير كلمة المرور.";
  if (error instanceof Error && error.message) return error.message;
  return "حدث خطأ غير متوقع.";
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setMessage("");
    setOk(false);

    const auth = getFirebaseAuth();
    if (!auth) {
      setMessage("Firebase غير مهيأ حاليا.");
      setLoading(false);
      return;
    }

    try {
      const form = new FormData(formElement);
      await sendPasswordResetEmail(auth, String(form.get("email")), {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setOk(true);
      setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني.");
      formElement.reset();
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-blue-900/10">
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-blue-50 text-blue-700">
          <Mail className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950">نسيت كلمة المرور</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          اكتب بريدك المسجل وسنرسل لك رابطا آمنا لإعادة تعيين كلمة المرور.
        </p>
      </div>

      <Field label="البريد الإلكتروني">
        <Input name="email" type="email" required />
      </Field>

      {message ? (
        <p className={`rounded-lg p-3 text-sm font-bold leading-6 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="h-11">
        إرسال رابط إعادة التعيين
      </Button>
    </form>
  );
}

export function UpdatePasswordForm({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setMessage("");
    setOk(false);

    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!auth || !user || !user.email) {
      setMessage("سجل الدخول مرة أخرى قبل تغيير كلمة المرور.");
      setLoading(false);
      return;
    }

    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setMessage("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.");
      setLoading(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(email || user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setOk(true);
      setMessage("تم تحديث كلمة المرور بنجاح.");
      formElement.reset();
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-800">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <p>لأمان الحساب، يجب إدخال كلمة المرور الحالية قبل حفظ كلمة مرور جديدة.</p>
      </div>

      <Field label="كلمة المرور الحالية">
        <Input name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="كلمة المرور الجديدة">
        <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="تأكيد كلمة المرور الجديدة">
        <Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
      </Field>

      {message ? (
        <p className={`rounded-lg p-3 text-sm font-bold leading-6 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="h-11">
        <KeyRound className="size-4" />
        تحديث كلمة المرور
      </Button>
    </form>
  );
}
