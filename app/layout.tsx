import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autoparts CRM",
  description: "Внутренняя CRM магазина автозапчастей",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
