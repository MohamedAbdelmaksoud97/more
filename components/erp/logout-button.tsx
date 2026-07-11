"use client";

import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">خروج</span>
    </button>
  );
}
