"use client";

import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";

function getEmailActionUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = configuredUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/$/, "")}/login`;
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function friendlyVerificationError(error: unknown) {
  const code = getErrorCode(error);
  if (code.includes("unauthorized-continue-uri") || code.includes("unauthorized-domain")) {
    return "دومين الموقع غير مضاف في Firebase Authentication. أضف more-mocha.vercel.app في Authorized domains.";
  }
  if (code.includes("too-many-requests")) return "تم إرسال روابط كثيرة. انتظر قليلا ثم جرّب مرة أخرى.";
  if (error instanceof Error && error.message) return error.message;
  return "تعذر إرسال رابط التأكيد الآن.";
}

export function VerifyEmailActions() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const user = getFirebaseAuth()?.currentUser;
      if (!user) {
        setError("سجل الدخول بنفس الحساب أولا، ثم ارجع لهذه الصفحة لإعادة إرسال رابط التأكيد.");
        return;
      }

      await sendEmailVerification(user, {
        url: getEmailActionUrl(),
        handleCodeInApp: false,
      });
      setMessage("تم إرسال رابط تأكيد جديد. راجع البريد الوارد والرسائل غير المرغوبة.");
    } catch (error) {
      setError(friendlyVerificationError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 grid gap-3">
      <Button type="button" variant="secondary" loading={loading} onClick={resend} className="h-11">
        <RotateCw className="size-4" />
        إعادة إرسال رابط التأكيد
      </Button>
      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">{error}</p> : null}
    </div>
  );
}
