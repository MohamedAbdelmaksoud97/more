"use client";

import { Download } from "lucide-react";

export type ExportSheet = {
  name: string;
  rows: Array<Record<string, string | number>>;
};

export function ReportExportButton({ sheets, filename }: { sheets: ExportSheet[]; filename: string }) {
  function downloadExcel() {
    const html = [
      "<html><head><meta charset='utf-8'></head><body>",
      ...sheets.map((sheet) => {
        const headers = Object.keys(sheet.rows[0] ?? {});
        return [
          `<h2>${escapeHtml(sheet.name)}</h2>`,
          "<table border='1'>",
          `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`,
          `<tbody>${sheet.rows
            .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("")}</tr>`)
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
