import Image from "next/image";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { adminNav, COMPANY, coordinatorNav, marketerNav, roleLabels } from "@/lib/constants";
import type { NavSection, UserProfile } from "@/lib/types";
import { NotificationBell } from "@/components/erp/notification-bell";
import { FcmRegistration } from "@/components/erp/fcm-registration";
import { LogoutButton } from "@/components/erp/logout-button";
import { NavLink } from "@/components/erp/nav-link";
import { MobileMenu } from "@/components/erp/mobile-menu";

function navForRole(role: UserProfile["role"]): NavSection[] {
  if (role === "admin") return adminNav;
  if (role === "coordinator") return coordinatorNav;
  return marketerNav;
}

export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: UserProfile;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const nav = navForRole(user.role);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff,#eef2f6)] text-slate-950">
      <FcmRegistration />
      <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-slate-200 bg-white/95 shadow-xl shadow-blue-950/5 backdrop-blur lg:block">
        <div className="flex h-24 items-center border-b border-slate-100 px-5">
          <Image
            src="/more-power-more-energy.png"
            alt={COMPANY.enName}
            width={72}
            height={72}
            className="size-16 rounded-md object-contain"
            priority
          />
          <div className="mr-3 min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{COMPANY.appName}</p>
            <p className="truncate text-xs font-bold text-emerald-600">{COMPANY.arName}</p>
          </div>
        </div>
        <nav className="space-y-6 p-4">
          {nav.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-xs font-black text-slate-400">{section.title}</p>
              <div className="mt-2 grid gap-1">
                {section.links.map((link) => (
                  <NavLink key={link.href} href={link.href} label={link.label} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 lg:pr-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/85 px-4 shadow-sm shadow-blue-950/5 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileMenu nav={nav} user={user} />
            <Image
              src="/more-power-more-energy.png"
              alt={COMPANY.enName}
              width={44}
              height={44}
              className="hidden size-10 rounded-md object-contain sm:block lg:hidden"
              priority
            />
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-600">{roleLabels[user.role]}</p>
              <h1 className="truncate text-lg font-black text-slate-950">{COMPANY.appName}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell unreadCount={unreadCount} />
            <Link href="/profile" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold hover:bg-slate-50">
              <UserCircle className="size-5 text-blue-700" />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        {description ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
