"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-[14px] font-medium mb-1.5">{title}</h3>
        {description && <p className="text-[13px] text-neutral-400 mb-4">{description}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-[13px] rounded-md font-medium ${
              danger
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
