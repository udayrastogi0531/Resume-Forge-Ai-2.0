"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2 } from "lucide-react";
import { api, CoverLetter } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/Primitives";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/lib/toastStore";

export default function CoverLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<CoverLetter[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoverLetter | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLetters(await api.listCoverLetters());
    } catch {
      toast("Could not load cover letters.", "error");
    }
  }

  async function duplicate(cl: CoverLetter) {
    try {
      await api.duplicateCoverLetter(cl.id);
      toast("Cover letter duplicated.", "success");
      load();
    } catch {
      toast("Could not duplicate cover letter.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteCoverLetter(deleteTarget.id);
      toast("Cover letter deleted.", "success");
      setDeleteTarget(null);
      load();
    } catch {
      toast("Could not delete cover letter.", "error");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Cover Letters</h1>
          <p className="text-[13px] text-neutral-500">Generated from your resume versions and job descriptions.</p>
        </div>
        <button
          onClick={() => router.push("/cover-letters/new")}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium text-[13px] px-3.5 py-2 rounded-md"
        >
          <Plus size={14} /> Generate Cover Letter
        </button>
      </div>

      {letters === null ? (
        <Skeleton className="h-32 w-full" />
      ) : letters.length === 0 ? (
        <EmptyState
          title="No cover letters."
          description="Generate a cover letter from a job description."
          action={
            <Link href="/cover-letters/new" className="text-[13px] text-emerald-400 hover:underline">
              Generate your first cover letter
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {letters.map((cl) => (
            <div key={cl.id} className="border border-neutral-800 rounded-lg p-4 flex flex-col">
              <Link href={`/cover-letters/${cl.id}`} className="flex-1">
                <h3 className="text-[14px] font-medium mb-1 truncate">{cl.title}</h3>
                <p className="text-[12px] text-neutral-500 capitalize">{cl.tone} · {cl.length}</p>
                <p className="text-[11px] text-neutral-600 mt-1">
                  {new Date(cl.updated_at).toLocaleDateString()}
                </p>
              </Link>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-800">
                <button onClick={() => duplicate(cl)} className="p-1 text-neutral-400 hover:text-neutral-100">
                  <Copy size={13} />
                </button>
                <button onClick={() => setDeleteTarget(cl)} className="p-1 text-neutral-400 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this cover letter?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
