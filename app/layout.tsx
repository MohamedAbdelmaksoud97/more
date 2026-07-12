import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Suspense } from "react";
import { RouteProgress } from "@/components/erp/route-progress";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MORE Energy ERP",
  description: "نظام إدارة موارد مور لأعمال الطاقة",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MORE ERP",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/more-power-more-energy.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/more-power-more-energy.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-100">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
