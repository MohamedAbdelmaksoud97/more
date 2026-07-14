"use client";

import { Download } from "lucide-react";

export type ExportSheet = {
  name: string;
  rows: Array<Record<string, string | number>>;
};

export function ReportExportButton({ sheets, filename }: { sheets: ExportSheet[]; filename: string }) {
  function downloadExcel() {
    const generatedAt = new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date());
    const html = [
      "<html><head><meta charset='utf-8'>",
      "<style>",
      "body{direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#0f172a;background:#fff}",
      ".report-title{background:#0f4c81;color:#fff;padding:18px 20px;font-size:22px;font-weight:700}",
      ".report-meta{padding:8px 20px 18px;color:#64748b;font-size:12px}",
      ".sheet-title{margin:22px 0 8px;color:#075985;font-size:18px;font-weight:700}",
      "table{border-collapse:collapse;width:100%;margin-bottom:18px;table-layout:auto}",
      "th{background:#eaf3ff;color:#0f172a;border:1px solid #b6c8df;padding:8px 10px;font-weight:700;text-align:right;white-space:nowrap}",
      "td{border:1px solid #dbe4ef;padding:7px 10px;text-align:right;vertical-align:middle}",
      "tbody tr:nth-child(even){background:#f8fafc}",
      ".empty{padding:12px;border:1px solid #dbe4ef;color:#64748b;background:#f8fafc}",
      ".number{mso-number-format:'0.00';font-weight:700}",
      "</style></head><body>",
      "<div class='report-title'>MORE Energy ERP - التقرير الشهري</div>",
      `<div class='report-meta'>تم التصدير بتوقيت مصر: ${escapeHtml(generatedAt)}</div>`,
      ...sheets.map((sheet) => {
        const headers = Object.keys(sheet.rows[0] ?? {});
        if (!headers.length) {
          return `<h2 class='sheet-title'>${escapeHtml(sheet.name)}</h2><div class='empty'>لا توجد بيانات في هذا القسم.</div>`;
        }
        return [
          `<h2 class='sheet-title'>${escapeHtml(sheet.name)}</h2>`,
          "<table>",
          `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`,
          `<tbody>${sheet.rows
            .map(
              (row) =>
                `<tr>${headers
                  .map((header) => {
                    const value = row[header] ?? "";
                    const isNumber = typeof value === "number";
                    return `<td${isNumber ? " class='number'" : ""}>${escapeHtml(String(value))}</td>`;
                  })
                  .join("")}</tr>`,
            )
            .join("")}</tbody>`,
          "</table>",
        ].join("");
      }),
      "</body></html>",
    ].join("");
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadExcel}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800"
    >
      <Download className="size-4" />
      تصدير Excel
    </button>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
