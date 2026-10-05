"use client";

import { useRef, useState } from "react";
import { FileText, Upload, ClipboardPaste, FilePlus2 } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

type Mode = "menu" | "templates" | "paste";

export default function NewResumeModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, latex?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function close() {
    setMode("menu");
    setPasteText("");
    onClose();
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".tex")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onCreate(file.name.replace(/\.tex$/i, ""), String(reader.result));
      close();
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-5"
      >
        {mode === "menu" && (
          <>
            <h2 className="text-[14px] font-medium mb-4">New Resume</h2>
            <div className="space-y-2">
              <OptionRow
                icon={FilePlus2}
                title="Blank Resume"
                desc="Start from a minimal starter document."
                onClick={() => {
                  onCreate("Untitled Resume");
                  close();
                }}
              />
              <OptionRow
                icon={FileText}
                title="Choose a Template"
                desc="Modern Developer, ATS Minimal, or Academic."
                onClick={() => setMode("templates")}
              />
              <OptionRow
                icon={Upload}
                title="Upload .tex File"
                desc="Import an existing LaTeX resume file."
                onClick={() => fileInputRef.current?.click()}
              />
              <OptionRow
                icon={ClipboardPaste}
                title="Paste LaTeX Source"
                desc="Paste raw LaTeX you already have."
                onClick={() => setMode("paste")}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tex"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </>
        )}

        {mode === "templates" && (
          <>
            <h2 className="text-[14px] font-medium mb-4">Choose a Template</h2>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <OptionRow
                  key={t.id}
                  icon={FileText}
                  title={t.name}
                  desc={t.description}
                  onClick={() => {
                    onCreate(t.name, t.latex);
                    close();
                  }}
                />
              ))}
            </div>
            <button onClick={() => setMode("menu")} className="text-[12px] text-neutral-500 hover:text-neutral-300 mt-4">
              ← Back
            </button>
          </>
        )}

        {mode === "paste" && (
          <>
            <h2 className="text-[14px] font-medium mb-3">Paste LaTeX Source</h2>
            <textarea
              autoFocus
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              placeholder="\documentclass{article}..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setMode("menu")} className="text-[12px] text-neutral-500 hover:text-neutral-300">
                ← Back
              </button>
              <button
                disabled={!pasteText.trim()}
                onClick={() => {
                  onCreate("Untitled Resume", pasteText);
                  close();
                }}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-medium text-[13px] px-3.5 py-1.5 rounded-md"
              >
                Create Resume
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OptionRow({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 text-left border border-neutral-800 rounded-md px-3 py-2.5 hover:bg-neutral-800/60 hover:border-neutral-700 transition-colors"
    >
      <Icon size={16} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={1.75} />
      <div>
        <p className="text-[13px] text-neutral-100">{title}</p>
        <p className="text-[11px] text-neutral-500">{desc}</p>
      </div>
    </button>
  );
}
