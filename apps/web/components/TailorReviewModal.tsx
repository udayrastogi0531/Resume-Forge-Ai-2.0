"use client";

import { TailorResult } from "@/lib/api";
import { LatexDiffEditor } from "./LatexEditor";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

export default function TailorReviewModal({
  original,
  result,
  onApply,
  onKeepOriginal,
  onCancel,
  applying,
}: {
  original: string;
  result: TailorResult;
  onApply: () => void;
  onKeepOriginal: () => void;
  onCancel: () => void;
  applying: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg w-full max-w-6xl h-[90vh] sm:h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <div>
            <h2 className="text-[14px] font-medium">
              {result.compiled ? "AI has prepared an optimized version" : "Tailoring could not be applied"}
            </h2>
            <p className="text-[12px] text-neutral-500">Review the changes before applying them as a new version.</p>
          </div>
          <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-200 text-[13px]">
            Close
          </button>
        </div>

        {/* Stacked vertically below lg so the diff isn't squeezed next to a fixed-width sidebar on narrow screens */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 min-h-0 border-b lg:border-b-0 lg:border-r border-neutral-800">
            <LatexDiffEditor original={original} modified={result.updated_latex} />
          </div>
          <div className="lg:w-80 lg:shrink-0 overflow-auto p-4 space-y-5 text-[13px] max-h-48 lg:max-h-none">
            {result.ats_before && result.ats_after && (
              <div>
                <h3 className="text-[12px] font-medium text-neutral-400 mb-2">ATS Score</h3>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">{result.ats_before.score}</span>
                  <span className="text-neutral-600">→</span>
                  <span
                    className={
                      result.ats_after.score >= result.ats_before.score ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {result.ats_after.score}
                  </span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[12px] font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                {result.truthfulness_check.passed ? (
                  <ShieldCheck size={13} className="text-emerald-400" />
                ) : (
                  <ShieldAlert size={13} className="text-red-400" />
                )}
                Truthfulness check
              </h3>
              <p className={result.truthfulness_check.passed ? "text-emerald-400" : "text-red-400"}>
                {result.truthfulness_check.passed ? "Passed — no fabricated claims detected." : "Failed"}
              </p>
              {result.truthfulness_check.fabricated_claims.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-red-300">
                  {result.truthfulness_check.fabricated_claims.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            {result.changes.length > 0 && (
              <div>
                <h3 className="text-[12px] font-medium text-neutral-400 mb-2">Changes</h3>
                <ul className="space-y-2">
                  {result.changes.map((c, i) => (
                    <li key={i} className="border border-neutral-800 rounded-md p-2">
                      <span className="text-[10px] uppercase tracking-wide text-emerald-400">{c.type}</span>
                      <p className="text-[12px] text-neutral-300 mt-0.5">{c.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.matched_keywords.length > 0 && (
              <div>
                <h3 className="text-[12px] font-medium text-neutral-400 mb-2">Matched Keywords</h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_keywords.map((k) => (
                    <span key={k} className="text-[11px] bg-emerald-950/50 text-emerald-300 border border-emerald-900 rounded px-1.5 py-0.5">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.missing_keywords.length > 0 && (
              <div>
                <h3 className="text-[12px] font-medium text-neutral-400 mb-2">
                  Missing from current resume (not added)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_keywords.map((k) => (
                    <span key={k} className="text-[11px] bg-neutral-900 text-neutral-400 border border-neutral-800 rounded px-1.5 py-0.5">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h3 className="text-[12px] font-medium text-amber-400 mb-2">Warnings</h3>
                <ul className="space-y-1 text-amber-300">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {!result.compiled && result.compile_log && (
              <div>
                <h3 className="text-[12px] font-medium text-red-400 mb-2 flex items-center gap-1.5">
                  <XCircle size={13} /> Compile log
                </h3>
                <pre className="text-[10px] text-neutral-500 whitespace-pre-wrap max-h-40 overflow-auto bg-neutral-900 rounded p-2">
                  {result.compile_log}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-800">
          <button
            onClick={onKeepOriginal}
            className="px-3.5 py-1.5 text-[13px] rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
          >
            Keep Original
          </button>
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-[13px] rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
          >
            Discard
          </button>
          <button
            onClick={onApply}
            disabled={!result.compiled || applying}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-medium"
          >
            <CheckCircle2 size={14} />
            {applying ? "Saving…" : "Apply as New Version"}
          </button>
        </div>
      </div>
    </div>
  );
}
