"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);
  const [isVisible, setIsVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      setPendingRequests((count) => count + 1);
      try {
        return await originalFetch(...args);
      } finally {
        setPendingRequests((count) => Math.max(0, count - 1));
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target || anchor.download) return;
      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (`${nextUrl.pathname}${nextUrl.search}` === `${window.location.pathname}${window.location.search}`) return;
      setIsVisible(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsVisible(false), 280);
    return () => window.clearTimeout(timeout);
  }, [routeKey]);

  const active = isVisible || pendingRequests > 0;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-blue-100 transition-opacity ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!active}
    >
      <div className="h-full w-2/3 animate-[route-progress_1s_ease-in-out_infinite] rounded-l-full bg-gradient-to-l from-blue-700 via-emerald-500 to-amber-400" />
    </div>
  );
}
