"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "تأكيد",
  children,
  action,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  children: React.ReactNode;
  action: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                loading={loading}
                type="button"
                onClick={async () => {
                  setLoading(true);
                  await action();
                  setLoading(false);
                  setOpen(false);
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
