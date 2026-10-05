"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, Sparkles, ScanSearch, Mail, type LucideIcon } from "lucide-react";
import { api, JobDescription, ApiError } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/Primitives";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/lib/toastStore";

export default function JDPage() {
  const [jds, setJds] = useState<JobDescription[] | null>(null);
  const [selected, setSelected] = useState<JobDescription | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobDescription | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const list = await api.listJDs();
      setJds(list);
      if (list.length > 0) setSelected(list[0]);
    } catch {
      toast("Could not load job descriptions.", "error");
    }
  }

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast("Only PDF files are supported for job descriptions.", "error");
      return;
    }
    setUploading(true);
    try {
      const jd = await api.uploadJD(file);
      toast("Job description uploaded and analyzed.", "success");
      setJds((prev) => [jd, ...(prev || [])]);
      setSelected(jd);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteJD(deleteTarget.id);
      setJds((prev) => (prev || []).filter((j) => j.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast("Job description deleted.", "success");
    } catch {
      toast("Could not delete job description.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <h1 className="text-lg font-medium mb-1">Job Descriptions</h1>
      <p className="text-[13px] text-neutral-500 mb-6">Upload a job description PDF to extract requirements and match it against your resume.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg py-10 flex flex-col items-center justify-center cursor-pointer mb-8 transition-colors ${
          dragActive ? "border-emerald-500 bg-emerald-950/10" : "border-neutral-800 hover:border-neutral-700"
        }`}
      >
        <Upload size={22} className="text-neutral-500 mb-2" />
        <p className="text-[13px] text-neutral-300">
          {uploading ? "Uploading and analyzing…" : "Drag & drop a JD PDF, or click to browse"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {jds === null ? (
        <Skeleton className="h-40 w-full" />
      ) : jds.length === 0 ? (
        <EmptyState title="No job descriptions." description="Upload a JD to start tailoring your resume." />
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-1.5">
            {jds.map((jd) => (
              <div
                key={jd.id}
                onClick={() => setSelected(jd)}
                className={`px-3 py-2.5 rounded-md cursor-pointer border ${
                  selected?.id === jd.id ? "border-emerald-700 bg-neutral-900" : "border-neutral-800 hover:bg-neutral-900/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] truncate">
                      {jd.structured_data?.job_title || jd.filename || "Job description"}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {jd.structured_data?.company || jd.filename}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(jd);
                    }}
                    className="text-neutral-600 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2">
            {selected ? <JDDetail jd={selected} /> : (
              <p className="text-[13px] text-neutral-500">Select a job description to view details.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this job description?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function JDDetail({ jd }: { jd: JobDescription }) {
  const router = useRouter();
  const sd = jd.structured_data || {};
  const hasError = "_error" in sd;

  return (
    <div className="border border-neutral-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-medium">{sd.job_title || jd.filename}</h2>
          {sd.company && <p className="text-[13px] text-neutral-500">{sd.company}</p>}
        </div>
        <FileText size={18} className="text-neutral-600" />
      </div>

      {hasError ? (
        <p className="text-[13px] text-red-400">
          AI analysis of this JD failed: {sd._error}. Try re-uploading it.
        </p>
      ) : (
        <div className="space-y-4 text-[13px]">
          <Field label="Location" value={sd.location} />
          <Field label="Employment Type" value={sd.employment_type} />
          <Field label="Experience" value={sd.experience_requirements} />
          <Field label="Education" value={sd.education_requirements} />

          {sd.required_skills && sd.required_skills.length > 0 && (
            <SkillList label="Required Skills" items={sd.required_skills} tone="emerald" />
          )}
          {sd.preferred_skills && sd.preferred_skills.length > 0 && (
            <SkillList label="Preferred Skills" items={sd.preferred_skills} tone="neutral" />
          )}
          {sd.responsibilities && sd.responsibilities.length > 0 && (
            <div>
              <h3 className="text-[12px] font-medium text-neutral-400 mb-1">Responsibilities</h3>
              <ul className="list-disc list-inside text-neutral-400 space-y-0.5">
                {sd.responsibilities.slice(0, 8).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-800">
        <ActionButton icon={ScanSearch} label="Analyze Resume" onClick={() => router.push("/resumes")} />
        <ActionButton icon={Sparkles} label="Tailor Resume" onClick={() => router.push("/resumes")} accent />
        <ActionButton icon={Mail} label="Generate Cover Letter" onClick={() => router.push("/cover-letters")} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <h3 className="text-[12px] font-medium text-neutral-400">{label}</h3>
      <p className="text-neutral-200">{value}</p>
    </div>
  );
}

function SkillList({ label, items, tone }: { label: string; items: string[]; tone: "emerald" | "neutral" }) {
  return (
    <div>
      <h3 className="text-[12px] font-medium text-neutral-400 mb-1">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s}
            className={`text-[11px] rounded px-1.5 py-0.5 border ${
              tone === "emerald"
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-900"
                : "bg-neutral-900 text-neutral-400 border-neutral-800"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, accent }: { icon: LucideIcon; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] ${
        accent ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium" : "border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
