import type { Metadata } from "next";
import "./globals.css";
import ToastViewport from "@/components/ToastViewport";

export const metadata: Metadata = {
  title: "ResumeForge AI",
  description: "LaTeX resume editor and job-application optimization platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
