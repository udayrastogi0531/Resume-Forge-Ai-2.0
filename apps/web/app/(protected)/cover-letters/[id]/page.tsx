"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Download, Trash2, RefreshCw, Loader2, type LucideIcon } from "lucide-react";
import { saveAs } from "file-saver";
import { api, CoverLetter, ApiError } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/lib/toastStore";

export default function CoverLetterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [cl, setCl] = useState<CoverLetter | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [regenerating, setRegenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    try {
      const data = await api.getCoverLetter(params.id);
      setCl(data);
      setContent(data.content);
      setTitle(data.title);
    } catch {
      toast("Could not load cover letter.", "error");
    }
  }

  function onContentChange(v: string) {
    setContent(v);
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(v, title), 1000);
  }

  function onTitleChange(v: string) {
    setTitle(v);
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(content, v), 1000);
  }

  async function save(newContent: string, newTitle: string) {
    setSaveStatus("saving");
    try {
      await api.updateCoverLetter(params.id, { content: newContent, title: newTitle });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
      toast("Autosave failed.", "error");
    }
  }

  async function regenerate() {
    if (!cl?.resume_version_id || !cl?.job_description_id) {
      toast("Missing resume/JD reference for regeneration.", "error");
      return;
    }
    setRegenerating(true);
    try {
      const fresh = await api.generateCoverLetter({
        resume_version_id: cl.resume_version_id,
        job_description_id: cl.job_description_id,
        tone: cl.tone,
        length: cl.length,
      });
      setContent(fresh.content);
      await api.updateCoverLetter(params.id, { content: fresh.content });
      toast("Cover letter regenerated.", "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Regeneration failed.", "error");
    } finally {
      setRegenerating(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(content);
    toast("Copied to clipboard.", "success");
  }

  function download() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${(title || "cover-letter").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`);
  }

  async function confirmDelete() {
    try {
      await api.deleteCoverLetter(params.id);
      toast("Cover letter deleted.", "success");
      router.push("/cover-letters");
    } catch {
      toast("Could not delete cover letter.", "error");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!cl) {
    return <div className="p-8 text-[13px] text-neutral-500">Loading…</div>;
  }


  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-1">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-lg font-medium bg-transparent border-none focus:outline-none flex-1"
        />
        <SaveStatusBadge status={saveStatus} />
      </div>
      <p className="text-[12px] text-neutral-500 mb-6 capitalize">{cl.tone} tone · {cl.length} length</p>

      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        rows={20}
        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-y"
      />

      <div className="flex items-center gap-2 mt-4">
        <ActionButton icon={Copy} label="Copy" onClick={copy} />
        <ActionButton icon={Download} label="Download" onClick={download} />
        <ActionButton icon={RefreshCw} label={regenerating ? "Regenerating…" : "Regenerate"} onClick={regenerate} loading={regenerating} />
        <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteOpen(true)} danger />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this cover letter?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function SaveStatusBadge({ status }: { status: "saved" | "saving" | "unsaved" }) {
  const label = status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Unsaved changes";
  const color = status === "saved" ? "text-emerald-500" : status === "saving" ? "text-neutral-400" : "text-amber-400";
  return <span className={`text-[11px] ${color} shrink-0 ml-3`}>● {label}</span>;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] border disabled:opacity-50 ${
        danger
          ? "border-red-900 text-red-400 hover:bg-red-950/40"
          : "border-neutral-800 text-neutral-300 hover:bg-neutral-900"
      }`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}
