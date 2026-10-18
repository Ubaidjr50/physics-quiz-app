import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Physics Quiz System",
  description:
    "Class 9 Sindh Board Physics online quiz and examination system.",
  applicationName: "Physics Quiz System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}