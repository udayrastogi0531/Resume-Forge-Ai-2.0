"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2, FolderOpen, type LucideIcon } from "lucide-react";
import { api, Project } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/Primitives";
import ConfirmDialog from "@/components/ConfirmDialog";
import NewResumeModal from "@/components/NewResumeModal";
import { toast } from "@/lib/toastStore";

export default function ResumesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setProjects(await api.listProjects());
    } catch {
      toast("Could not load resume projects.", "error");
    }
  }

  async function createResume(name: string, latex?: string) {
    setCreating(true);
    try {
      const project = await api.createProject(name, latex);
      router.push(`/resumes/${project.id}/editor`);
    } catch {
      toast("Could not create a new resume.", "error");
      setCreating(false);
    }
  }

  async function duplicateProject(p: Project) {
    try {
      const versions = await api.listVersions(p.id);
      const latest = versions[versions.length - 1];
      await api.createProject(`${p.name} (copy)`, latest?.latex_source);
      toast("Resume duplicated.", "success");
      load();
    } catch {
      toast("Could not duplicate resume.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteProject(deleteTarget.id);
      toast("Resume deleted.", "success");
      setDeleteTarget(null);
      load();
    } catch {
      toast("Could not delete resume.", "error");
    }
  }

  // Renaming a project isn't a distinct backend concept beyond its name;
  // there's no PATCH /projects/:id route yet, so rename is scoped to
  // versions in the editor. Here we just surface project-level actions
  // that map to real endpoints.

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Resume Projects</h1>
          <p className="text-[13px] text-neutral-500">All your resume projects and their versions.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={creating}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-medium text-[13px] px-3.5 py-2 rounded-md"
        >
          <Plus size={14} /> New Resume
        </button>
      </div>

      {projects === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="Your next application starts here."
          description="Create your first resume to start editing in LaTeX."
          action={
            <button onClick={() => setModalOpen(true)} className="text-[13px] text-emerald-400 hover:underline">
              Create Resume
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="border border-neutral-800 rounded-lg p-4 flex flex-col">
              <button
                className="text-left flex-1"
                onClick={() => router.push(`/resumes/${p.id}/editor`)}
              >
                <h3 className="text-[14px] font-medium mb-1 truncate">{p.name}</h3>
                <p className="text-[12px] text-neutral-500">
                  {p.version_count} version{p.version_count === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-neutral-600 mt-1">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </button>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-800">
                <IconButton icon={FolderOpen} label="Open" onClick={() => router.push(`/resumes/${p.id}/editor`)} />
                <IconButton icon={Copy} label="Duplicate" onClick={() => duplicateProject(p)} />
                <IconButton icon={Trash2} label="Delete" danger onClick={() => setDeleteTarget(p)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this resume project?"
        description={`"${deleteTarget?.name}" and all of its versions will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <NewResumeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createResume} />
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
        danger ? "text-red-400 hover:bg-red-950/40" : "text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      <Icon size={13} />
    </button>
  );
}
