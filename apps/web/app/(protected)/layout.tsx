"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Mail,
  Settings,
  LogOut,
  FileStack,
} from "lucide-react";
import { useAuthStore, initialToken } from "@/lib/authStore";
import { api } from "@/lib/api";
import CommandPalette from "@/components/CommandPalette";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resumes", label: "Resume Studio", icon: FileStack },
  { href: "/jd", label: "Job Descriptions", icon: FileText },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setAuth, logout } = useAuthStore();
  const [checked, setChecked] = useState(!!user);

  useEffect(() => {
    const token = initialToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user) {
      api
        .me()
        .then((me) => setAuth(token, me))
        .catch(() => router.replace("/login"))
        .finally(() => setChecked(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
        Loading ResumeForge AI…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-60 shrink-0 border-r border-neutral-800 flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-800 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-[15px]">
            ResumeForge <span className="text-emerald-400">AI</span>
          </span>
          <kbd className="text-[10px] text-neutral-600 border border-neutral-800 rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  active
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900"
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-neutral-800">
          <div className="text-[12px] text-neutral-500 px-1 mb-2 truncate">
            {user?.email}
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-[13px] text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
