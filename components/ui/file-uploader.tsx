"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileUploader({
  folder,
  onUploaded,
}: {
  folder: string;
  onUploaded?: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setLoading(true);
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);
    const response = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(result.error ?? "تعذر رفع الملف");
      return;
    }
    setMessage("تم رفع الملف بنجاح");
    onUploaded?.(result.url);
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">رفع ملف أو صورة</span>
        <Button type="button" variant="secondary" loading={loading}>
          <Upload className="size-4" />
          اختيار
        </Button>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {message ? <p className="mt-2 text-xs font-semibold text-slate-600">{message}</p> : null}
    </div>
  );
}
