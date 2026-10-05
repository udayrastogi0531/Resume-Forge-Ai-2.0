"use client";

import { useState } from "react";
import { Copy, Trash2, Pencil, Download, Check, X } from "lucide-react";
import { Version } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";

export default function VersionDrawer({
  versions,
  activeId,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onDownloadTex,
}: {
  versions: Version[];
  activeId: string | null;
  onOpen: (v: Version) => void;
  onRename: (v: Version, name: string) => void;
  onDuplicate: (v: Version) => void;
  onDelete: (v: Version) => void;
  onDownloadTex: (v: Version) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Version | null>(null);

  return (
    <div className="w-64 shrink-0 border-r border-neutral-800 flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-neutral-800 text-[12px] font-medium text-neutral-300">
        Resume Versions
      </div>
      <div className="flex-1 overflow-auto py-1">
        {versions
          .slice()
          .sort((a, b) => b.version_number - a.version_number)
          .map((v) => (
            <div
              key={v.id}
              className={`group px-3 py-2 cursor-pointer border-l-2 ${
                v.id === activeId
                  ? "border-emerald-400 bg-neutral-900"
                  : "border-transparent hover:bg-neutral-900/60"
              }`}
              onClick={() => onOpen(v)}
            >
              {editingId === v.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-[12px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRename(v, editValue);
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button onClick={() => { onRename(v, editValue); setEditingId(null); }}>
                    <Check size={13} className="text-emerald-400" />
                  </button>
                  <button onClick={() => setEditingId(null)}>
                    <X size={13} className="text-neutral-500" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-neutral-100 truncate">{v.name}</span>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-1">v{v.version_number}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-neutral-500">
                      {v.ats_score != null ? `ATS ${v.ats_score}` : v.status}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1.5">
                      <button
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(v.id);
                          setEditValue(v.name);
                        }}
                      >
                        <Pencil size={11} className="text-neutral-500 hover:text-neutral-200" />
                      </button>
                      <button
                        title="Duplicate"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(v);
                        }}
                      >
                        <Copy size={11} className="text-neutral-500 hover:text-neutral-200" />
                      </button>
                      <button
                        title="Download .tex"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadTex(v);
                        }}
                      >
                        <Download size={11} className="text-neutral-500 hover:text-neutral-200" />
                      </button>
                      <button
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(v);
                        }}
                      >
                        <Trash2 size={11} className="text-neutral-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this version?"
        description={`"${deleteTarget?.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
