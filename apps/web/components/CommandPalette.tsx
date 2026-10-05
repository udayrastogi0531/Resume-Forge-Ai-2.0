"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileStack,
  Upload,
  Mail,
  Settings,
  LayoutDashboard,
  Search,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";

interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function newResume() {
    setCreating(true);
    try {
      const project = await api.createProject("Untitled Resume");
      setOpen(false);
      router.push(`/resumes/${project.id}/editor`);
    } finally {
      setCreating(false);
    }
  }

  const commands: Command[] = [
    { id: "new-resume", label: "New Resume", icon: Plus, run: newResume },
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, run: () => nav("/dashboard") },
    { id: "studio", label: "Open Resume Studio", icon: FileStack, run: () => nav("/resumes") },
    { id: "upload-jd", label: "Upload Job Description", icon: Upload, run: () => nav("/jd") },
    { id: "cover-letter", label: "Generate Cover Letter", icon: Mail, run: () => nav("/cover-letters/new") },
    { id: "settings", label: "Open Settings", icon: Settings, run: () => nav("/settings") },
  ];

  function nav(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center pt-32 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-800">
          <Search size={14} className="text-neutral-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-neutral-600"
          />
          <kbd className="text-[10px] text-neutral-600 border border-neutral-800 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="py-1.5 max-h-72 overflow-auto">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-neutral-500 px-3 py-3">No matching commands.</p>
          ) : (
            filtered.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={c.run}
                  disabled={creating && c.id === "new-resume"}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
                >
                  <Icon size={14} className="text-emerald-400" strokeWidth={1.75} />
                  {c.label}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
