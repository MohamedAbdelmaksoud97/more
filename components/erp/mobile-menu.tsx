"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COMPANY } from "@/lib/constants";
import type { NavSection, UserProfile } from "@/lib/types";
import { LogoutButton } from "@/components/erp/logout-button";
import { cn } from "@/lib/utils";

export function MobileMenu({ nav, user }: { nav: NavSection[]; user: UserProfile }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const menu = open ? (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#0f172a",
      }}
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/more-power-more-energy.png"
            alt={COMPANY.enName}
            width={40}
            height={40}
            className="size-9 shrink-0 rounded-md object-contain"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{COMPANY.appName}</p>
            <p className="truncate text-xs font-bold text-emerald-600">{COMPANY.arName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-700"
          aria-label="إغلاق القائمة"
        >
          <X className="size-5" />
        </button>
      </header>

      <nav
        className="px-4 py-5"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          background: "#ffffff",
        }}
      >
        <div className="grid gap-6">
          {nav.map((section) => (
            <section key={section.title}>
              <p className="px-3 text-xs font-black text-slate-400">{section.title}</p>
              <div className="mt-2 grid gap-1">
                {section.links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-xl px-3 py-3 text-sm font-bold transition",
                        active
                          ? "bg-blue-700 text-white shadow-sm shadow-blue-900/20"
                          : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <footer className="grid shrink-0 gap-2 border-t border-slate-100 bg-slate-50 p-4">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
        >
          <UserCircle className="size-5 shrink-0 text-blue-700" />
          <span className="min-w-0 truncate">{user.name}</span>
        </Link>
        <LogoutButton />
      </footer>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 lg:hidden"
        aria-label="فتح القائمة"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
