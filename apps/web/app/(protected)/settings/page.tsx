"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/authStore";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [health, setHealth] = useState<{ ai_provider: string } | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium mb-1">Settings</h1>
        <p className="text-[13px] text-neutral-500">Account, AI provider, and preferences.</p>
      </div>

      <Section title="Account">
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Name" value={user?.full_name || "—"} />
      </Section>

      <Section title="AI Provider">
        <Row label="Active provider" value={health?.ai_provider || "Loading…"} />
        <p className="text-[12px] text-neutral-500 mt-2">
          Configuration (API keys, model, and fallback behavior) is handled entirely through
          server-side environment variables (<code className="text-neutral-400">GROQ_API_KEY</code>,{" "}
          <code className="text-neutral-400">AI_PROVIDER</code>, etc.) and is never exposed to the
          browser. To change providers, update the API&apos;s <code className="text-neutral-400">.env</code>{" "}
          file and restart the backend.
        </p>
      </Section>

      <Section title="Appearance">
        <Row label="Theme" value="Dark (default)" />
        <p className="text-[12px] text-neutral-500 mt-2">Light theme is not yet available.</p>
      </Section>

      <Section title="Preferences">
        <Row label="Default cover letter tone" value="Professional" />
        <Row label="Default cover letter length" value="Medium" />
        <p className="text-[12px] text-neutral-500 mt-2">
          These defaults are pre-selected on the cover letter generation screen and can be changed per letter.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-5">
      <h2 className="text-[13px] font-medium mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200">{value}</span>
    </div>
  );
}
